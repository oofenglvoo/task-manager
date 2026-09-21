"""给 E2E 临时数据库灌入固定测试数据（仅走真实 HTTP API）。

用法（在 backend/ 下，先用 scripts/e2e-server.ps1 起好服务）：

    .venv\\Scripts\\python ..\\scripts\\e2e_seed.py --port 8021

只创建本脚本自己命名的数据，绝不删除、不修改其它行——安全规则见 AGENTS.md。
"""

from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.request
import json

TAG_PREFIX = "e2e-"
TASK_PREFIX = "【E2E】"

# 一张 120x60 的蓝白格子 PNG（见 scripts 内的生成说明）。
# 刻意用高对比色而不是纯白图，方便肉眼确认预览窗确实把图片渲染出来了。
SAMPLE_IMAGE_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAHgAAAA8CAIAAAAiz+n/AAAAj0lEQVR42u3ZsQkAIAxE0ezldq7g"
    "TK5kJ7hDCgnkwe8PXnsx5km39k3XbTdAgwYNGjRo0KBBgwYNGjRo0KBBgwYNGjRo0KBBgy4KDevP"
    "LmjQoEGDBg0aNGjQoEGDBg0aNGjQoEGDBg0aNGjQVaFhecFBgwYNGjRo0KBBgwYNGjRo0KBBgwYN"
    "GjRo0KBBt4Z+jY6zyTOX5AsAAAAASUVORK5CYII="
)

# 一段足够长的富文本 + 内嵌图片，用于验证预览窗「不截断、图片可见」。
LONG_DESCRIPTION = (
    "<p><strong>第一段</strong>：这段文字故意写得很长，用于验证只读预览窗不会像卡片那样"
    "截断成几行，而是完整显示全部内容。卡片上受限于高度只会露出前几行，"
    "预览窗应该把整段完整呈现出来。</p>"
    "<p><em>第二段</em>：包含 <u>下划线</u>、<s>删除线</s> 与 <span style=\"color:#ef4444\">彩色文字</span>，"
    "用来确认富文本格式在预览窗中同样生效。</p>"
    "<ul><li>无序项 A</li><li>无序项 B</li></ul>"
    "<ol><li>有序项 1</li><li>有序项 2</li></ol>"
    f'<p><img src="data:image/png;base64,{SAMPLE_IMAGE_B64}" alt="E2E 测试图片"></p>'
)


def request(method: str, url: str, payload: dict | None = None, cookie: str | None = None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if cookie:
        req.add_header("Cookie", cookie)

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            body = response.read().decode()
            return response.status, (json.loads(body) if body else None), response.headers
    except urllib.error.HTTPError as error:
        detail = error.read().decode()
        raise SystemExit(f"{method} {url} -> {error.code}: {detail}") from error


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8021)
    parser.add_argument("--username", default="tester")
    parser.add_argument("--password", default="tester-password")
    args = parser.parse_args()

    base = f"http://{args.host}:{args.port}"

    _, _, headers = request(
        "POST",
        f"{base}/api/auth/login",
        {"username": args.username, "password": args.password},
    )
    raw_cookie = headers.get("Set-Cookie")
    if not raw_cookie:
        raise SystemExit("登录失败：响应没有 Set-Cookie")
    cookie = raw_cookie.split(";")[0]
    print("[seed] 登录成功")

    _, statuses, _ = request("GET", f"{base}/api/statuses", cookie=cookie)
    _, priorities, _ = request("GET", f"{base}/api/priorities", cookie=cookie)
    open_status = next((s for s in statuses if not s["is_done"]), statuses[0])
    high_priority = max(priorities, key=lambda p: p["level"])

    _, groups, _ = request("GET", f"{base}/api/groups", cookie=cookie)
    group = next((g for g in groups if g["name"].startswith(TAG_PREFIX)), None)
    if group is None:
        status, group, _ = request(
            "POST",
            f"{base}/api/groups",
            {"name": f"{TAG_PREFIX}演示分组", "color": "#6366f1", "note": "E2E 测试数据"},
            cookie=cookie,
        )
        print(f"[seed] 创建分组 {group['id']}")

    _, tags, _ = request("GET", f"{base}/api/tags", cookie=cookie)
    tag = next((t for t in tags if t["name"].startswith(TAG_PREFIX)), None)
    if tag is None:
        _, tag, _ = request(
            "POST",
            f"{base}/api/tags",
            {"name": f"{TAG_PREFIX}长文本", "color": "#38bdf8"},
            cookie=cookie,
        )
        print(f"[seed] 创建标签 {tag['id']}")

    _, existing, _ = request("GET", f"{base}/api/tasks", cookie=cookie)
    created = 0

    if not any(t["title"].startswith(f"{TASK_PREFIX}长内容") for t in existing):
        _, task, _ = request(
            "POST",
            f"{base}/api/tasks",
            {
                "title": f"{TASK_PREFIX}长内容与图片（用于预览窗验证）",
                "status_id": open_status["id"],
                "group_id": group["id"],
                "priority": high_priority["id"],
                "due_date": "2026-12-31T18:30",
                "description": LONG_DESCRIPTION,
                "tag_ids": [tag["id"]],
            },
            cookie=cookie,
        )
        print(f"[seed] 创建任务 {task['id']}（长描述 + 图片）")

        for index in range(1, 7):
            request(
                "POST",
                f"{base}/api/tasks/{task['id']}/subtasks",
                {"title": f"子任务 {index}"},
                cookie=cookie,
            )
        print("[seed] 创建 6 条子任务")
        created += 1

    if not any(t["title"].startswith(f"{TASK_PREFIX}已逾期") for t in existing):
        _, task, _ = request(
            "POST",
            f"{base}/api/tasks",
            {
                "title": f"{TASK_PREFIX}已逾期任务",
                "status_id": open_status["id"],
                "group_id": group["id"],
                "priority": high_priority["id"],
                "due_date": "2026-01-01T09:00",
                "description": "<p>用于验证逾期样式。</p>",
                "tag_ids": [tag["id"]],
            },
            cookie=cookie,
        )
        print(f"[seed] 创建任务 {task['id']}（已逾期）")
        created += 1

    print(f"[seed] 完成，新建 {created} 个任务")
    return 0


if __name__ == "__main__":
    sys.exit(main())
