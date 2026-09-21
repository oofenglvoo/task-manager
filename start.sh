#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "============================================"
echo "  任务管理系统 - 快速启动"
echo "============================================"

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 未检测到 Node.js，请先安装 Node.js 18 或更高版本：https://nodejs.org/"
  exit 1
fi

echo "[1/3] 已检测到 Node.js $(node -v)"

# 根依赖指纹：package.json 变了才重装。
# 与 run.mjs / deps_hash.py 使用同一套「分隔符 + 相对路径 + 文件内容」的 SHA-256 格式，
# 保证三个启动入口写入/读取的标记一致，不会互相触发重装。
hash_file() {
  local rel="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$rel" <<'PY'
import hashlib, sys, pathlib
rel = sys.argv[1]
p = pathlib.Path(rel)
data = p.read_bytes() if p.is_file() else b""
sep = b"\x00--deps-file--\x00"
print(hashlib.sha256(sep + rel.replace("\\", "/").encode("utf-8") + sep + data).hexdigest())
PY
  else
    local tmp
    tmp="$(mktemp)"
    printf '\x00--deps-file--\x00%s\x00--deps-file--\x00' "$rel" > "$tmp"
    if [ -f "$rel" ]; then cat "$rel" >> "$tmp"; fi
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum "$tmp" | awk '{print $1}'
    elif command -v shasum >/dev/null 2>&1; then
      shasum -a 256 "$tmp" | awk '{print $1}'
    else
      echo ""
    fi
    rm -f "$tmp"
  fi
}

ROOT_HASH_NOW="$(hash_file package.json)"
ROOT_HASH_OLD="$(cat node_modules/.deps-hash 2>/dev/null || true)"

if [ ! -d node_modules ] || [ "$ROOT_HASH_NOW" != "$ROOT_HASH_OLD" ]; then
  echo "[2/3] 正在安装根依赖..."
  npm install
  mkdir -p node_modules
  printf '%s\n' "$ROOT_HASH_NOW" > node_modules/.deps-hash
else
  echo "[2/3] 根依赖已就绪"
fi

echo "[3/3] 启动服务（首次会安装前后端依赖并构建前端）..."
echo "  访问地址：http://127.0.0.1:8001"
echo "  按 Ctrl+C 可停止服务"
echo

exec npm run dev "$@"
