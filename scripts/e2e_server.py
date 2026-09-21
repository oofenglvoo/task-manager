"""E2E 临时后端服务管理（启动 / 停止 / 状态）。

为什么不用 PowerShell：这个仓库的路径含中文（`任务管理系统`），而 Windows
上两种常见的后台启动方式都会出事——

1. `Start-Process -RedirectStandardOutput`：子进程继承调用方的控制台句柄。
   uvicorn 常驻不退出，句柄永不关闭，调用方 shell **永久阻塞**（服务其实已
   经起来了，看起来就像「卡死几分钟」）。
2. WMI `Win32_Process.Create`：命令串要经过 ANSI 转换，系统代码页是 GBK
   (936) 时中文路径被破坏成乱码，进程静默失败且零输出。

Python 的 `subprocess.Popen` 两个坑都避开了：字符串全程 Unicode，经
`CreateProcessW` 传递；`DETACHED_PROCESS` 不继承控制台句柄，调用立即返回。

另一个坑：本脚本自身运行在没有可继承控制台的环境里，任何控制台子系统子
进程（python / powershell / taskkill / netstat）都会被 Windows 新分配一个
**可见的空白控制台窗口**。所以下面每个 `subprocess` 调用都必须带 `NO_WINDOW`。

特别注意 `Popen` 启动 uvicorn 这一处：`DETACHED_PROCESS` 解决的是**父进程
阻塞**（不继承控制台句柄），它**不解决弹窗**——恰恰相反，它清空了控制台，
控制台子系统（Subsystem=3）的 `python.exe` 在「无控制台且未指定
`CREATE_NO_WINDOW`」时，系统会补一个新的可见控制台窗口。所以两个标志必须
**同时**带：`DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | NO_WINDOW`。
（`pythonw.exe` 是 Subsystem=2 不会弹窗，但 stdout/stderr 默认丢弃，不如
`NO_WINDOW` 零风险。）

用法（在仓库根目录）：

    python scripts/e2e_server.py start              # 重建临时库并启动
    python scripts/e2e_server.py start --keep-db    # 保留已有临时库
    python scripts/e2e_server.py start --port 8022
    python scripts/e2e_server.py status
    python scripts/e2e_server.py stop

临时库与日志都放在系统临时目录，**不触碰** `data/tasks.db`。
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
VENV_PYTHON = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"

WORK_DIR = Path(tempfile.gettempdir()) / "opencode"

# 让所有控制台子系统子进程都不弹窗（父进程无可继承控制台时尤其重要）。
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0

# 便于测试脚本直接登录，与 backend/tests/conftest.py 保持一致。
TEST_USERNAME = "tester"
TEST_PASSWORD = "tester-password"
TEST_SECRET = "e2e-secret-key"

# 只匹配本项目的 uvicorn，避免误杀用户其它 Python 程序。
UVICORN_MARKERS = ("uvicorn", "app.main:app")


def db_path(port: int) -> Path:
    return WORK_DIR / f"e2e-{port}.db"


def log_path(port: int) -> Path:
    return WORK_DIR / f"e2e-{port}.log"


def err_path(port: int) -> Path:
    return WORK_DIR / f"e2e-{port}.err"


def pid_path(port: int) -> Path:
    return WORK_DIR / f"e2e-{port}.pid"


def _iter_processes():
    """枚举系统进程 (pid, command_line)，仅 Windows。"""
    if os.name != "nt":
        return

    # 只在清理历史残留时作为兜底使用（正常路径走 PID 文件）。
    # wmic 在新系统上已被弃用，这里用 CIM；powershell 只是取数，不启动服务。
    query = (
        "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | "
        "ForEach-Object { \"$($_.ProcessId)`t$($_.CommandLine)\" }"
    )
    try:
        output = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", query],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=20,
            creationflags=NO_WINDOW,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return

    for line in output.splitlines():
        line = line.strip()
        if not line or "\t" not in line:
            continue
        raw_pid, _, command = line.partition("\t")
        try:
            pid = int(raw_pid.strip())
        except ValueError:
            continue
        yield pid, command


def find_uvicorn_pids() -> list[int]:
    pids = []
    for pid, command in _iter_processes():
        if all(marker in command for marker in UVICORN_MARKERS):
            pids.append(pid)
    return pids


def process_alive(pid: int) -> bool:
    """用 tasklist 判断进程是否存活（带 NO_WINDOW，不会弹窗）。"""
    try:
        output = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}", "/NH"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            creationflags=NO_WINDOW,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return False
    return str(pid) in output


def kill_tree(pid: int) -> None:
    """结束进程及其子进程（uvicorn 会 fork 出两个）。"""
    try:
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True,
            timeout=20,
            creationflags=NO_WINDOW,
        )
    except (OSError, subprocess.SubprocessError):
        pass


def read_pid_file(port: int) -> int | None:
    path = pid_path(port)
    if not path.exists():
        return None
    try:
        return int(path.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return None


def stop_uvicorn(quiet: bool = False, port: int | None = None) -> int:
    """结束本项目遗留的 uvicorn。

    正常路径直接读 PID 文件（快且不弹窗）；PID 文件缺失或已失效时才回退到
    按命令行枚举。返回结束的进程数（按 PID 文件路径算 1 个服务）。
    """
    stopped = 0

    if port is not None:
        recorded = read_pid_file(port)
        if recorded is not None:
            if process_alive(recorded):
                if not quiet:
                    print(f"[e2e] 结束服务进程 {recorded}")
                kill_tree(recorded)
                stopped += 1
            # 等进程真正退出（有界，不再反复起 powershell）。
            for _ in range(8):
                if not process_alive(recorded):
                    break
                time.sleep(0.25)
            pid_path(port).unlink(missing_ok=True)

    # 兜底：清理没有 PID 文件记录的残留（例如上次异常中断）。
    leftovers = find_uvicorn_pids()
    for pid in leftovers:
        if not quiet:
            print(f"[e2e] 清理残留进程 {pid}")
        kill_tree(pid)
        stopped += 1

    return stopped


def port_owner(port: int) -> int | None:
    """返回占用端口的 PID（含非本项目进程）。用 netstat，比 CIM 快且稳定。"""
    if os.name != "nt":
        return None
    try:
        output = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            creationflags=NO_WINDOW,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return None

    for line in output.splitlines():
        parts = line.split()
        # 形如：TCP  127.0.0.1:8021  0.0.0.0:0  LISTENING  12345
        if len(parts) < 5 or parts[0].upper() != "TCP" or parts[3].upper() != "LISTENING":
            continue
        local = parts[1]
        if local.rsplit(":", 1)[-1] == str(port):
            return int(parts[4]) if parts[4].isdigit() else None
    return None


def health_ok(port: int, timeout: float = 3.0) -> bool:
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/health", timeout=timeout
        ) as response:
            return response.status == 200
    except (urllib.error.URLError, OSError, ValueError):
        return False


def start(port: int, keep_db: bool) -> int:
    if not VENV_PYTHON.exists():
        print(f"[e2e] 未找到后端虚拟环境：{VENV_PYTHON}", file=sys.stderr)
        print("[e2e] 请先运行 npm run dev 或手动创建 .venv。", file=sys.stderr)
        return 1

    WORK_DIR.mkdir(parents=True, exist_ok=True)
    stop_uvicorn(quiet=True, port=port)

    owner = port_owner(port)
    if owner:
        print(f"[e2e] 端口 {port} 仍被进程 {owner} 占用（非本项目的 uvicorn）。", file=sys.stderr)
        print("[e2e] 请先处理它，或换一个 --port。", file=sys.stderr)
        return 1

    target_db = db_path(port)
    if not keep_db and target_db.exists():
        target_db.unlink()
        print(f"[e2e] 已删除旧的临时数据库 {target_db}")

    env = os.environ.copy()
    env["TASK_DB_PATH"] = str(target_db)
    env["TASK_APP_USERNAME"] = TEST_USERNAME
    env["TASK_APP_PASSWORD"] = TEST_PASSWORD
    env["TASK_SECRET_KEY"] = TEST_SECRET
    env["PYTHONUNBUFFERED"] = "1"

    out_file = open(log_path(port), "w", encoding="utf-8")
    err_file = open(err_path(port), "w", encoding="utf-8")

    creationflags = 0
    if os.name == "nt":
        # DETACHED_PROCESS：不继承控制台句柄 → 调用方立即返回，不阻塞。
        # NO_WINDOW：控制台子系统（Subsystem=3）的 python.exe 在无控制台时会被
        # 系统补一个可见窗口；DETACHED_PROCESS 清空控制台，所以必须叠加它。
        creationflags = (
            subprocess.DETACHED_PROCESS
            | subprocess.CREATE_NEW_PROCESS_GROUP
            | NO_WINDOW
        )

    print(f"[e2e] 启动服务：端口 {port}，数据库 {target_db}")

    process = subprocess.Popen(
        [str(VENV_PYTHON), "-m", "uvicorn", "app.main:app", "--port", str(port)],
        cwd=str(BACKEND_DIR),
        env=env,
        stdout=out_file,
        stderr=err_file,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
        close_fds=True,
    )

    # 轮询探活，替代容易误判的固定 sleep。
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        time.sleep(0.5)
        if health_ok(port):
            out_file.close()
            err_file.close()
            # 记下 PID，stop 时直接用它，无需再枚举进程。
            pid_path(port).write_text(str(process.pid), encoding="utf-8")
            print(f"[e2e] 就绪：http://127.0.0.1:{port}")
            print(f"[e2e] pid {process.pid} · 数据库 {target_db}")
            print(f"[e2e] 日志 {err_path(port)}")
            print("[e2e] 收尾请执行：python scripts/e2e_server.py stop")
            return 0

        if process.poll() is not None:
            break

    out_file.close()
    err_file.close()
    stop_uvicorn(quiet=True, port=port)

    print("[e2e] 服务未能在 30 秒内就绪，已清理进程。", file=sys.stderr)
    tail = err_path(port).read_text(encoding="utf-8", errors="replace").strip()
    if tail:
        print(f"[e2e] 错误日志：\n{tail}", file=sys.stderr)
    return 1


def stop(port: int) -> int:
    count = stop_uvicorn(port=port)
    if count:
        print(f"[e2e] 已结束 {count} 个 uvicorn 进程。")

    owner = port_owner(port)
    if owner:
        print(f"[e2e] 警告：端口 {port} 仍被进程 {owner} 占用。", file=sys.stderr)
        return 1
    print(f"[e2e] 端口 {port} 已释放。")
    return 0


def status(port: int) -> int:
    recorded = read_pid_file(port)
    pids = [recorded] if recorded is not None and process_alive(recorded) else find_uvicorn_pids()
    healthy = health_ok(port)

    print(f"[e2e] uvicorn 进程：{pids if pids else '无'}")
    print(f"[e2e] 端口 {port} 健康：{'是' if healthy else '否'}")
    print(f"[e2e] 数据库：{db_path(port)}")
    return 0 if healthy else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="E2E 临时后端服务管理")
    parser.add_argument("action", choices=["start", "stop", "status", "restart"])
    parser.add_argument("--port", type=int, default=8021)
    parser.add_argument(
        "--keep-db",
        action="store_true",
        help="start 时保留已有临时数据库（默认每次重建，保证干净）",
    )
    args = parser.parse_args()

    try:
        if args.action == "start":
            return start(args.port, args.keep_db)
        if args.action == "stop":
            return stop(args.port)
        if args.action == "status":
            return status(args.port)
        stop(args.port)
        return start(args.port, args.keep_db)
    except KeyboardInterrupt:
        print("\n[e2e] 已中断。", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
