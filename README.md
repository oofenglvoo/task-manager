# 任务管理系统

一个中文任务管理应用：FastAPI + SQLite 后端，React + TypeScript 前端。以**便签墙**形式展示任务，
支持分组、拖拽排序、列表筛选、状态/标签/分组管理与统计总览。

## 功能

- **任务看板（便签墙）**：任务以彩色便签卡片错落排布，按优先级自动取便签底色并带轻微倾斜（悬停摆正）；卡片显示标题、描述、状态、优先级、分组、截止日期、标签、子任务进度，以及**创建时间与最后修改时间**；卡片上可勾选完成、点击优先级/状态快速修改；支持拖拽排序（手柄）、紧凑/宽松密度与三档卡片大小
- **任务分组**：可在看板工具栏「管理分组」弹窗中增删改分组（名称、颜色）；看板/列表/脑图均可一键切换「分组视图」或「不分组」，选择被持久化。分组视图下支持拖拽：**同组拖拽调整顺序，跨组拖拽直接迁移分组**（需「手动排序」）
- **顶部任务脉络（四视图）**：主页最上方以图的形式展示全部任务情况，可下拉切换四种视图并记忆选择——**桑基流带**（全部任务 → 优先级 → 状态 → 任务，连线粗细表示数量，优先级节点带完成进度）、**径向脑图**（中心汇总 + 向外的优先级/状态/任务环）、**四列树**（根 → 优先级 → 状态 → 任务）、**泳道画布**（优先级泳道 × 状态列的任务格）；前三种图直接显示**任务标题**（长标题自动换行，悬停看全文）；任务按**优先级 + 最近更新时间**综合评分排序，每分支最多 8 个，其余折叠为「还有 N 个…」；悬停显示标题/状态/优先级/分组/截止日期/子任务进度（逾期红色标注），点击任务节点打开详情；标题行含优先级图例、分组开关与一键折叠
- **列表视图**：搜索标题/描述，按状态、分组、优先级、标签筛选，按列排序，查看/恢复归档任务
- **任务详情**：点击卡片或铅笔图标打开详情抽屉，可修改标题、状态、优先级、分组、截止日期、标签与**任务详情（富文本）**；富文本支持加粗/斜体/下划线/删除线、字号、字体颜色、有序/无序列表，以及**图片粘贴/拖拽/上传**（以 base64 内嵌）；内容以本地草稿暂存，点底部**保存**统一提交，未保存关闭时会提示；管理子任务（增删改、勾选）；归档/恢复与删除均需确认
- **状态 / 标签 / 分组管理**：增删改、颜色、排序；状态可标记为「已完成」（任务进入后自动记录完成时间）
- **统计仪表盘**：与主页总览同源的完整统计（数字卡 + 状态/优先级分布）
- **界面**：默认收起左侧导航（顶部按钮展开），全宽展示任务看板
- **外观设置**：深色 / 浅色 / 跟随系统主题（顶栏可快捷切换）、卡片大小（小/中/大）、显示密度（宽松/紧凑）、自定义背景图片（本地上传或图片链接）；偏好保存在后端并在浏览器缓存

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | FastAPI、SQLAlchemy 2、SQLite、Pydantic v2、Uvicorn |
| 前端 | React 19、TypeScript 6、Vite 8、Tailwind CSS 3.4、TanStack Query v5、react-router-dom、@dnd-kit、lucide-react、ECharts 6（按需引入 + 懒加载） |
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
│   │   ├── seed.py     # 默认状态
│   │   ├── database.py # 引擎、会话与 ensure_schema() 迁移（TASK_DB_PATH 可覆盖数据库路径）
│   │   └── routers/    # statuses / tags / groups / tasks / subtasks / stats
│   └── tests/          # pytest 测试
├── frontend/           # React SPA
│   └── src/
│       ├── lib/        # api 封装、类型、工具
│       ├── hooks/      # TanStack Query 查询与变更
│       ├── store/      # 全局 UI 状态、Toast、外观偏好
│       └── components/ # layout / board / list / tasks / settings / stats / ui
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
http://127.0.0.1:8001 （接口文档 `/docs`），并会**自动打开系统默认浏览器**。按 Ctrl+C 停止。

可用脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 安装依赖 + 构建前端 + 启动后端（默认） |
| `npm start` | 同 `npm run dev` |
| `npm run build` | 仅安装前端依赖并构建，输出 `frontend/dist` |
| `npm run serve` | 跳过构建，直接用已构建的 `frontend/dist` 启动后端 |

可选参数：`--port <端口>`（或环境变量 `PORT`）指定后端端口；`--no-open` 启动时不自动打开浏览器。

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

访问 http://localhost:5173 ，开发服务器会将 `/api` 代理到 `http://127.0.0.1:8001`。

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

外观偏好（主题、卡片大小、显示密度、背景图片）保存到**后端**（`/api/settings`），同时在浏览器
`localStorage` 缓存一份以避免首屏闪烁，因此换浏览器/设备也能保持一致。本地上传的背景图片
保存到 `data/backgrounds/`。

## 数据与备份

- 全部业务数据保存在 SQLite 文件 `data/tasks.db`（可用环境变量 `TASK_DB_PATH` 覆盖路径）。
- **备份**：直接复制 `data/tasks.db`；或使用应用内「设置 → 数据 → 导出备份」下载 JSON。
- **恢复**：用导出的 JSON 通过「设置 → 数据 → 导入备份」还原；导入会**覆盖**当前全部数据
  （状态、标签、分组、任务、子任务）。
- 数据库文件已加入 `.gitignore`，不会随代码提交；注意 `git clean -xdf` 会删除它。

## 初始化数据

首次启动（导入 `app.main`）会自动建表并写入默认数据：

- 状态：待办、进行中、已完成（已完成 `is_done=true`）

> 历史版本曾包含「项目」概念，现已移除。启动时 `ensure_schema()` 会自动把旧数据库中的
> `projects` 表与 `tasks.project_id` 列安全移除，**保留全部任务及其时间戳**。

## API 概览

所有接口位于 `/api/*`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET/POST | `/api/statuses` | 状态列表 / 创建 |
| PUT/DELETE | `/api/statuses/{id}` | 更新 / 删除状态（被任务使用时返回 400） |
| PUT | `/api/statuses/reorder` | 状态排序 |
| GET/POST | `/api/tags` | 标签列表 / 创建 |
| PUT/DELETE | `/api/tags/{id}` | 更新 / 删除标签 |
| GET/POST | `/api/groups` | 分组列表（含任务数）/ 创建 |
| PUT/DELETE | `/api/groups/{id}` | 更新 / 删除分组（删除后其任务变为未分组） |
| PUT | `/api/groups/reorder` | 分组排序 |
| GET/POST | `/api/tasks` | 任务列表（支持 `status_id`、`group_id`、`ungrouped`、`priority`、`tag_id`、`q`、`archived`、`sort`、`order`）/ 创建 |
| GET/PUT/DELETE | `/api/tasks/{id}` | 查询 / 更新 / 删除任务 |
| PUT | `/api/tasks/{id}/move` | 移动任务（改状态 / 分组 / 位置；`group_id: null` 清空分组） |
| POST | `/api/tasks/{id}/archive` | 归档 / 恢复任务 |
| PUT | `/api/tasks/reorder` | 任务排序 |
| GET/POST | `/api/tasks/{id}/subtasks` | 子任务列表 / 创建 |
| PUT/DELETE | `/api/tasks/{id}/subtasks/{subtask_id}` | 更新 / 删除子任务 |
| GET | `/api/stats` | 统计（全部任务） |
| GET/PUT | `/api/settings` | 外观偏好（主题 / 卡片大小 / 紧凑模式 / 分组视图 / 背景 URL） |
| POST | `/api/backgrounds` | 上传背景图片（multipart，≤8MB），返回 `{ url }` |
| GET/DELETE | `/api/backgrounds/{file}` | 读取 / 删除背景图片 |
| GET | `/api/export` | 导出全部数据为 JSON |
| POST | `/api/import` | 导入 JSON（覆盖现有全部数据；兼容含 `projects` 字段的旧备份） |

## 约定

- 所有面向用户的文案、种子数据与错误信息均为中文。
- `priority` 为整数 1/2/3（低/中/高）。
- 时间以无时区的 UTC 存储，序列化时以 `Z` 结尾。
- 任务进入 `is_done=true` 的状态会自动写入 `completed_at`，移出时清空。
- 每个任务即一个独立条目，不再有「项目」层级；任务可归属一个可选的分组。
- `Task.description` 存储**富文本 HTML**（含 base64 内嵌图片），后端按不透明字符串处理；
  卡片、列表等纯文本场景通过 `frontend/src/lib/richText.ts` 的 `htmlToText()` 剥离标签。

更多开发与踩坑说明见 [AGENTS.md](./AGENTS.md)。
