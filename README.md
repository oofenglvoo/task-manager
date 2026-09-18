# 任务管理系统

一个中文任务管理应用：FastAPI + SQLite 后端，React + TypeScript 前端。以卡片网格展示任务，
支持拖拽排序、列表筛选、项目/状态/标签管理与统计仪表盘。

## 功能

- **任务看板**：任务以响应式卡片网格展示，直接看到标题、描述、状态、优先级、截止日期、标签与子任务进度；可拖拽排序，点击状态标签即可快速切换状态
- **列表视图**：搜索标题/描述，按项目、状态、优先级、标签筛选，按列排序，查看/恢复归档任务
- **任务详情**：编辑标题、描述、优先级、截止日期、标签；管理子任务（增删改、勾选）；归档/删除
- **项目管理**：创建、编辑、颜色标记、归档、删除
- **状态与标签管理**：增删改、颜色、排序；状态可标记为「已完成」（任务进入后自动记录完成时间）
- **统计仪表盘**：总任务、进行中、已完成、完成率、逾期、7 天内到期，以及按状态/优先级分布
- **界面**：默认收起左侧导航（顶部按钮展开），全宽展示任务看板

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | FastAPI、SQLAlchemy 2、SQLite、Pydantic v2、Uvicorn |
| 前端 | React 19、TypeScript 6、Vite 8、Tailwind CSS 3.4、TanStack Query v5、react-router-dom、@dnd-kit、lucide-react |
| 测试 | pytest + FastAPI TestClient |

## 目录结构

```
.
├── backend/            # FastAPI 应用与测试
│   ├── app/
│   │   ├── main.py     # 应用入口、路由挂载、SPA 托管
│   │   ├── models.py   # SQLAlchemy 模型
│   │   ├── schemas.py  # Pydantic 模型（UTC 时间序列化为 Z 结尾）
│   │   ├── crud.py     # 任务/排序等业务逻辑
│   │   ├── seed.py     # 默认状态与项目
│   │   ├── database.py # 引擎与会话（TASK_DB_PATH 可覆盖数据库路径）
│   │   └── routers/    # projects / statuses / tags / tasks / subtasks / stats
│   └── tests/          # pytest 测试
├── frontend/           # React SPA
│   └── src/
│       ├── lib/        # api 封装、类型、工具
│       ├── hooks/      # TanStack Query 查询与变更
│       ├── store/      # 全局 UI 状态、Toast
│       └── components/ # layout / board / list / tasks / projects / settings / stats / ui
├── data/               # 运行时 SQLite 数据库（gitignore）
├── scripts/run.mjs     # 一键运行脚本（装依赖 + 构建前端 + 启动后端）
├── package.json        # 根脚本入口：npm run dev / start / build / serve
├── AGENTS.md           # 面向开发者的仓库说明
└── README.md
```

## 快速开始

在仓库根目录执行一条命令：

```powershell
npm run dev
```

脚本会自动检测并安装后端（`backend/.venv`）与前端（`frontend/node_modules`）依赖，
构建前端到 `frontend/dist`，然后启动后端并由其托管前端。启动后访问
http://127.0.0.1:8000 （接口文档 `/docs`）。按 Ctrl+C 停止。

可用脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 安装依赖 + 构建前端 + 启动后端（默认） |
| `npm start` | 同 `npm run dev` |
| `npm run build` | 仅安装前端依赖并构建，输出 `frontend/dist` |
| `npm run serve` | 跳过构建，直接用已构建的 `frontend/dist` 启动后端 |

可选参数：`--port <端口>`（或环境变量 `PORT`）指定后端端口。

### 手动运行（可选，需要前端热更新时）

后端（在 `backend/` 下）：

```powershell
.venv\Scripts\python -m uvicorn app.main:app --reload
```

前端（在 `frontend/` 下）：

```powershell
npm install
npm run dev
```

访问 http://localhost:5173 ，开发服务器会将 `/api` 代理到 `http://127.0.0.1:8000`。

## 测试与检查

```powershell
# 后端全部测试（在 backend/ 下）
.venv\Scripts\python -m pytest

# 单个测试
.venv\Scripts\python -m pytest tests/test_tasks.py::test_reorder_tasks

# 前端类型检查 + 构建（在 frontend/ 下）
npm run build

# 前端 lint（oxlint）
npm run lint
```

## 配置

| 变量 | 说明 |
| --- | --- |
| `TASK_DB_PATH` | 覆盖数据库文件路径（绝对路径），默认 `data/tasks.db` |
| `VITE_API_BASE` | 前端 API 基础地址，默认走 Vite 代理的相对路径 `/api` |

## 初始化数据

首次启动（导入 `app.main`）会自动建表并写入默认数据：

- 状态：待办、进行中、已完成（已完成 `is_done=true`）
- 项目：默认项目

## API 概览

所有接口位于 `/api/*`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET/POST | `/api/projects` | 项目列表 / 创建 |
| PUT/DELETE | `/api/projects/{id}` | 更新 / 删除项目 |
| POST | `/api/projects/{id}/archive` | 归档 / 恢复项目 |
| PUT | `/api/projects/reorder` | 项目排序 |
| GET/POST | `/api/statuses` | 状态列表 / 创建 |
| PUT/DELETE | `/api/statuses/{id}` | 更新 / 删除状态（被任务使用时返回 400） |
| PUT | `/api/statuses/reorder` | 状态排序 |
| GET/POST | `/api/tags` | 标签列表 / 创建 |
| PUT/DELETE | `/api/tags/{id}` | 更新 / 删除标签 |
| GET/POST | `/api/tasks` | 任务列表（支持 `project_id`、`status_id`、`priority`、`tag_id`、`q`、`archived`、`sort`、`order`）/ 创建 |
| GET/PUT/DELETE | `/api/tasks/{id}` | 查询 / 更新 / 删除任务 |
| PUT | `/api/tasks/{id}/move` | 移动任务（改项目/状态/位置） |
| POST | `/api/tasks/{id}/archive` | 归档 / 恢复任务 |
| PUT | `/api/tasks/reorder` | 任务排序 |
| GET/POST | `/api/tasks/{id}/subtasks` | 子任务列表 / 创建 |
| PUT/DELETE | `/api/tasks/{id}/subtasks/{subtask_id}` | 更新 / 删除子任务 |
| GET | `/api/stats` | 统计（可用 `project_id` 限定项目） |

## 约定

- 所有面向用户的文案、种子数据与错误信息均为中文。
- `priority` 为整数 1/2/3（低/中/高）。
- 时间以无时区的 UTC 存储，序列化时以 `Z` 结尾。
- 任务进入 `is_done=true` 的状态会自动写入 `completed_at`，移出时清空。

更多开发与踩坑说明见 [AGENTS.md](./AGENTS.md)。
