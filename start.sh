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

if [ ! -d node_modules ]; then
  echo "[2/3] 首次运行，正在安装根依赖..."
  npm install
else
  echo "[2/3] 根依赖已就绪"
fi

echo "[3/3] 启动服务（首次会安装前后端依赖并构建前端）..."
echo "  访问地址：http://127.0.0.1:8001"
echo "  按 Ctrl+C 可停止服务"
echo

exec npm run dev "$@"
