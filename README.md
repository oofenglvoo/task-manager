# 任务管理系统

一个中文任务管理应用：FastAPI + SQLite 后端，React + TypeScript 前端。以**便签墙**形式展示任务，
支持分组、拖拽排序、列表筛选、状态/标签/分组管理与统计总览。

> 部署到服务器时，应用提供**用户名 + 密码登录**（登录态 30 天，可在设置页退出）；
> 详见「部署到服务器（Windows）」。本地开发需要先按「配置」一节设置账号相关环境变量。

## 功能

- **任务看板（便签墙）**：任务以彩色便签卡片错落排布，按优先级自动取便签底色并带轻微倾斜（悬停摆正），每个任务还可在表单/详情里**自定义卡片颜色**（清除后回退为按优先级取色）；卡片显示标题、描述、状态、优先级、分组、截止日期、标签、子任务进度，以及**创建时间与最后修改时间**；卡片上可勾选完成、点击优先级/状态快速修改；支持拖拽排序（手柄）、紧凑/宽松密度与三档卡片大小
- **任务分组**：可在看板工具栏「管理分组」弹窗中增删改分组（名称、颜色、**备注**），备注会显示在任务栏分组标题下方；分组可按拖动按钮排序（任务栏分组标题与分组管理弹窗内均可拖动，也支持键盘操作），**分组顺序改变后看板/列表中的分组区块与该组全部卡片整体移动**。看板/列表/脑图均可一键切换「分组视图」或「不分组」，选择被持久化。分组视图下支持拖拽：**同组拖拽调整顺序，跨组拖拽直接迁移分组，拖到分组顶部即可插到第一个**（需「手动排序」）
- **顶部任务脉络（五视图）**：主页最上方以图的形式展示全部任务情况，可下拉切换五种视图并记忆选择——**桑基流带**（全部任务 → 优先级 → 状态 → 任务，连线粗细表示数量，优先级节点带完成进度）、**径向脑图**（中心汇总 + 向外的优先级/状态/任务环）、**四列树**（根 → 优先级 → 状态 → 任务）、**泳道画布**（优先级泳道 × 状态列的任务格）、**评分柱状图**（按「分组顺序 > 组内卡片顺序 > 优先级等级」加权打分，**分组越靠前、组内越靠前分数越高**，横向柱条从高到低排列，柱条颜色与卡片一致，悬停显示分数拆解明细）；前四种图直接显示**任务标题**（长标题自动换行，悬停看全文）；任务按**优先级 + 最近更新时间**综合评分排序，每分支最多 8 个，其余折叠为「还有 N 个…」；悬停显示标题/状态/优先级/分组/截止日期/子任务进度（逾期红色标注），点击任务节点打开详情；标题行含优先级图例、分组开关与一键折叠
- **列表视图**：搜索标题/描述，按状态、分组、优先级、标签筛选，按列排序，查看/恢复归档任务
- **日历视图**：**月视图 / 周视图**切换、翻页、**鼠标滚轮翻页**（在日期网格区域上下滚动即可翻月/翻周）、回到今天；每格显示公历日、**农历（阴历）/节气/传统节日**与法定节假日**「休 / 班」角标**，并以**当天任务数（完成/总数）与完成度着色**体现进度（全部完成绿 / 进行中黄 / 含逾期红 / 待开始蓝），任务条按**便签色/优先级色**着色、逾期任务带红色左边条，逾期任务按时间精确判定；点击某天弹出当天任务列表，可直接打开任务详情或**新建任务（预填该日截止时间）**；复用顶部筛选（优先级/标签/搜索），默认排除已归档任务，周一为一周起始
- **任务详情**：点击卡片或铅笔图标打开详情抽屉，可修改标题、状态、优先级、分组、截止时间（精确到分）、标签与**任务详情（富文本）**；富文本支持加粗/斜体/下划线/删除线、字号、字体颜色、有序/无序列表，以及**图片粘贴/拖拽/上传**（以 base64 内嵌）；内容以本地草稿暂存，点底部**保存**统一提交，未保存关闭时会提示；管理子任务（增删改、勾选，标题可点击**行内编辑**）；归档/恢复与删除均需确认
- **只读预览（放大版卡片）**：点击卡片正文弹出居中预览窗，**完整显示**描述富文本（含内嵌图片）、全部子任务、全部标签与各时间字段（不截断），子任务可直接勾选，其余字段只读；点右上角铅笔进入可编辑抽屉，「编辑」按钮亦可一键跳转
- **历史修改**：每次保存（含新建）会记录一条任务主字段快照（状态/分组/标签保存为名称，描述去除图片），详情抽屉底部以**竖向时间线**展示，可删除单条历史（二次确认）；历史随导出/导入一并备份
- **状态 / 标签 / 分组 / 优先级管理**：增删改、颜色、排序；状态可标记为「已完成」（任务进入后自动记录完成时间）；**优先级可自由增删**（名称、颜色、权重），看板底色、图表与筛选随之变化
- **登录鉴权**：部署时使用用户名 + 密码登录（HttpOnly Cookie 保存 30 天），未登录只能看到登录页；登录态失效时自动跳回登录页，可在「设置 → 账号」退出登录
- **统计仪表盘**：与主页总览同源的完整统计（数字卡 + 状态/优先级分布）
- **界面**：默认收起左侧导航（顶部按钮展开），全宽展示任务看板；深色/浅色主题共用一套
  工作区结构，顶栏、侧栏、卡片、浮层和表单控件使用统一的层级、圆角、阴影与交互态；
  看板便签保留颜色语义与轻微随机倾斜，悬停时摆正并抬升
- **外观设置**：深色 / 浅色 / 跟随系统主题（顶栏可快捷切换）、卡片大小（小/中/大）、显示密度（宽松/紧凑）、自定义背景图片（本地上传或图片链接）、**背景遮罩与卡片/面板不透明度**（三个滑块，数值越大越不透明：100% 完全不透明、0% 全透明；背景遮罩仅在设置背景图片后可见）。便签卡片与**任务脉络内的泳道格/任务条**跟随「卡片」不透明度；**任务脉络外层面板、顶栏与侧栏**跟随「面板」不透明度；按钮（含看板/脉络工具栏、列表操作、富文本工具栏等图标按钮）、下拉菜单、徽章与选中态始终保持实色，不随滑块变透明。偏好保存在后端并在浏览器缓存

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | FastAPI、SQLAlchemy 2、SQLite、Pydantic v2、Uvicorn |
| 前端 | React 19、TypeScript 6、Vite 8、Tailwind CSS 3.4、TanStack Query v5、react-router-dom、@dnd-kit、lucide-react、ECharts 6（按需引入 + 懒加载）、lunar-javascript（农历计算，离线） |
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
│   │   └── routers/    # statuses / tags / groups / priorities / tasks / subtasks / stats / holidays
│   └── tests/          # pytest 测试
├── frontend/           # React SPA
│   └── src/
│       ├── lib/        # api 封装、类型、工具（含日历 calendar.ts、农历 lunar.ts）
│       ├── hooks/      # TanStack Query 查询与变更
│       ├── store/      # 全局 UI 状态、Toast、外观偏好
│       └── components/ # layout / board / list / calendar / tasks / settings / stats / ui
├── data/               # 运行时 SQLite 数据库（gitignore）
├── scripts/run.mjs     # 一键运行脚本（装依赖 + 构建前端 + 启动后端）
├── start.bat           # Windows 双击启动（本机开发）
├── start.sh            # macOS / Linux 启动脚本（本机开发）
├── start-server.bat    # Windows 服务器部署启动（读取 server.env，监听 0.0.0.0）
├── server.env.example  # 部署配置模板（复制为 server.env 后填写）
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

> **依赖更新会自动识别**：脚本按 `backend/requirements.txt`、`frontend/package-lock.json`
> （根目录为 `package.json`）的内容计算 SHA-256 指纹并写入依赖目录内的 `.deps-hash` 标记，
> 与上次安装的指纹不一致时才重新安装。所以升级依赖后无需手动 `pip install` / `npm install`，
> 直接重新启动即可；清单没变则跳过安装，启动更快。安装失败会直接报错停止，不会带着旧依赖继续跑。

可用脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 安装依赖 + 构建前端 + 启动后端（默认） |
| `npm start` | 同 `npm run dev` |
| `npm run build` | 仅安装前端依赖并构建，输出 `frontend/dist` |
| `npm run serve` | 跳过构建，直接用已构建的 `frontend/dist` 启动后端 |

可选参数：`--port <端口>`（或环境变量 `PORT`）指定后端端口；`--no-open` 启动时不自动打开浏览器。

### 双击启动（Windows）

不想开终端时，直接双击仓库根目录的 **`start.bat`**：脚本会检测 Node.js 版本、按需安装根依赖，
然后调用 `npm run dev`（首次运行会自动安装前后端依赖并构建前端）。也支持透传参数：

```bat
start.bat --port 8002 --no-open
```

macOS / Linux 使用 `./start.sh`，逻辑相同。

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

## 部署到服务器（Windows）

> 需要 **Python 3.10+** 与 **Node.js 18+**，首次部署的机器上都要装好。

### 1. 配置账号

复制 `server.env.example` 为 `server.env`，填写账号信息（`server.env` 不会被提交）：

```ini
TASK_APP_USERNAME=admin
TASK_APP_PASSWORD=改成你的密码
TASK_SECRET_KEY=改成一串足够长的随机字符串
TASK_TOKEN_DAYS=30
APP_HOST=0.0.0.0
APP_PORT=8001
```

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `TASK_APP_USERNAME` | 是 | 登录用户名 |
| `TASK_APP_PASSWORD` | 是 | 登录密码 |
| `TASK_SECRET_KEY` | 是 | 登录令牌签名密钥，**改动会让所有人重新登录** |
| `TASK_TOKEN_DAYS` | 否 | 登录态有效期（天），默认 `30` |
| `APP_HOST` | 否 | 监听地址，默认 `0.0.0.0`（允许其他机器访问） |
| `APP_PORT` | 否 | 监听端口，默认 `8001` |

三项必填项缺任意一项，后端会在启动时**直接报错退出**。

> `server.env` 由 `scripts/load_env.py` 读取，已兼容 UTF-8 BOM、CRLF/LF、值两侧引号与空格；
> 若仍提示缺少变量，请确认文件里确实是 `TASK_APP_USERNAME=你的用户名` 这样的 `KEY=VALUE` 形式。
> 修改 `server.env` 后需要重新运行 `start-server.bat` 才会生效。

### 2. 启动

双击 `start-server.bat`：它会读取 `server.env`、按需创建 `backend/.venv` 并装依赖、
构建前端，最后以 `APP_HOST:APP_PORT` 启动服务。按 Ctrl+C 停止。

> 与 `npm run dev` 相同，它也会比对依赖清单指纹：`requirements.txt` / `package-lock.json`
> 有更新时会**自动重新安装**，无需手动执行 `pip install` / `npm install`。
> `APP_HOST` 请填 `0.0.0.0`（云服务器上公网 IP 并不在本机网卡上，填公网 IP 会导致绑定失败退出）。

也可以手动启动（需要先设置好上面的环境变量）：

```powershell
backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8001
```

命令行参数可覆盖 `server.env` 里的地址与端口。

### 3. 放行防火墙端口

管理员 PowerShell 中执行（按需改成实际端口）：

```powershell
netsh advfirewall firewall add rule name="Task Manager 8001" dir=in action=allow protocol=TCP localport=8001
```

### 4. 访问

浏览器打开 `http://<服务器IP>:8001`，首次访问会看到登录页，输入 `server.env` 中配置的用户名与密码。
同一局域网的其他机器用服务器 IP 即可访问。

### 5. 更新部署

拉取新代码后重新执行 `start-server.bat`（或手动重新 `npm run build`），前端产物在 `frontend/dist`，
改动前端必须重新构建才会生效。

### 安全提示

- 直连 IP + 端口是 **HTTP 明文**，用户名密码与登录令牌都会明文传输。内网使用尚可，
  **公网部署强烈建议在前面加一层 HTTPS 反向代理**。
- 建议把防火墙规则限制为可信来源 IP，而不是对所有来源开放。
- 数据库与上传的背景图片都在 `data/` 目录，部署前请先做好备份。

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

### 浏览器端手动验证（可选）

需要跑 E2E 或做界面验证时，用临时数据库起一个可丢弃的服务，**不会碰真实数据**：

```powershell
# 在仓库根目录；默认端口 8021，每次重建临时库
python scripts\e2e_server.py start

# 灌入固定测试数据（登录后创建 【E2E】 任务：长富文本+图片、6 条子任务、一条逾期）
python scripts\e2e_seed.py --port 8021

# 查看状态 / 收尾（务必执行，避免残留进程）
python scripts\e2e_server.py status
python scripts\e2e_server.py stop
```

临时库与日志位于 `%TEMP%\opencode\e2e-<端口>.db|.log|.err`，服务 PID 记录在同目录的
`e2e-<端口>.pid`（`stop` 据此直接结束进程树，无需枚举）。服务会顺带托管
`frontend/dist`，所以先 `npm run build` 再用浏览器打开 `http://127.0.0.1:8021`。

> 请勿手写 `Start-Process` / 裸 `Invoke-WebRequest` 来起服务：前者会让常驻子进程继承控制台
> 句柄而**永久阻塞**调用方，后者默认**无限等待**。脚本用 `subprocess.Popen` +
> `DETACHED_PROCESS` 规避，并给探活加了显式超时；脚本内所有 `subprocess` 调用都带
> `CREATE_NO_WINDOW`，因此不会弹出空白 PowerShell 窗口。

## 配置

| 变量 | 说明 |
| --- | --- |
| `TASK_APP_USERNAME` | 登录用户名（部署必填） |
| `TASK_APP_PASSWORD` | 登录密码（部署必填） |
| `TASK_SECRET_KEY` | 登录令牌签名密钥（部署必填） |
| `TASK_TOKEN_DAYS` | 登录态有效期（天），默认 `30` |
| `APP_HOST` / `APP_PORT` | `start-server.bat` 使用的监听地址与端口 |
| `TASK_DB_PATH` | 覆盖数据库文件路径（绝对路径），默认 `data/tasks.db` |
| `VITE_API_BASE` | 前端 API 基础地址，默认走 Vite 代理的相对路径 `/api` |

> 注意：后端在启动时会校验 `TASK_APP_USERNAME` / `TASK_APP_PASSWORD` / `TASK_SECRET_KEY`，
> 未配置会直接报错退出，因此运行 `pytest` 或本地调试时也需要先设置这三项。

外观偏好（主题、卡片大小、显示密度、背景图片）保存到**后端**（`/api/settings`），同时在浏览器
`localStorage` 缓存一份以避免首屏闪烁，因此换浏览器/设备也能保持一致。本地上传的背景图片
保存到 `data/backgrounds/`。

## 数据与备份

- 全部业务数据保存在 SQLite 文件 `data/tasks.db`（可用环境变量 `TASK_DB_PATH` 覆盖路径）。
- **备份**：直接复制 `data/tasks.db`；或使用应用内「设置 → 数据 → 导出备份」下载 JSON。
- **恢复**：用导出的 JSON 通过「设置 → 数据 → 导入备份」还原；导入会**覆盖**当前全部数据
  （状态、标签、分组、优先级、任务、子任务、历史记录）。备份**不包含**外观偏好（主题/卡片大小/
  透明度/背景）与背景图片文件，导入后外观沿用当前设置。
- 数据库文件已加入 `.gitignore`，不会随代码提交；注意 `git clean -xdf` 会删除它。
- 节假日缓存位于 `data/holidays/{year}.json`（首次访问某年日历时自动抓取并写入，之后离线可用；
  删除后可重新抓取）。

## 初始化数据

首次启动（导入 `app.main`）会自动建表并写入默认数据：

- 状态：待办、进行中、已完成（已完成 `is_done=true`）

> 历史版本曾包含「项目」概念，现已移除。启动时 `ensure_schema()` 会自动把旧数据库中的
> `projects` 表与 `tasks.project_id` 列安全移除，**保留全部任务及其时间戳**。

## API 概览

所有接口位于 `/api/*`。除 `/api/auth/*` 与 `/api/health` 外，其余接口都需要登录，
未登录会返回 401。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（无需登录） |
| POST | `/api/auth/login` | 用户名 + 密码登录，成功后下发登录 Cookie（无需登录） |
| POST | `/api/auth/logout` | 退出登录（无需登录） |
| GET | `/api/auth/session` | 查询当前登录状态（无需登录） |
| GET/POST | `/api/statuses` | 状态列表 / 创建 |
| PUT/DELETE | `/api/statuses/{id}` | 更新 / 删除状态（被任务使用时返回 400） |
| PUT | `/api/statuses/reorder` | 状态排序 |
| GET/POST | `/api/tags` | 标签列表 / 创建 |
| PUT/DELETE | `/api/tags/{id}` | 更新 / 删除标签 |
| GET/POST | `/api/groups` | 分组列表（含任务数与备注）/ 创建 |
| PUT/DELETE | `/api/groups/{id}` | 更新（名称 / 颜色 / 备注）/ 删除分组（删除后其任务变为未分组） |
| PUT | `/api/groups/reorder` | 分组排序 |
| GET/POST | `/api/priorities` | 优先级列表（含任务数）/ 创建（名称 / 颜色 / 权重） |
| PUT/DELETE | `/api/priorities/{id}` | 更新 / 删除优先级（被任务使用或仅剩一条时返回 400） |
| PUT | `/api/priorities/reorder` | 优先级排序 |
| GET/POST | `/api/tasks` | 任务列表（支持 `status_id`、`group_id`、`ungrouped`、`priority`、`tag_id`、`q`、`archived`、`sort`、`order`）/ 创建 |
| GET/PUT/DELETE | `/api/tasks/{id}` | 查询 / 更新 / 删除任务 |
| PUT | `/api/tasks/{id}/move` | 移动任务（改状态 / 分组 / 位置；`group_id: null` 清空分组） |
| POST | `/api/tasks/{id}/archive` | 归档 / 恢复任务 |
| PUT | `/api/tasks/reorder` | 任务排序 |
| GET/POST | `/api/tasks/{id}/subtasks` | 子任务列表 / 创建 |
| PUT/DELETE | `/api/tasks/{id}/subtasks/{subtask_id}` | 更新（标题 / 是否完成）/ 删除子任务 |
| GET | `/api/tasks/{id}/history` | 任务历史快照（最新在前） |
| DELETE | `/api/tasks/{id}/history/{history_id}` | 删除单条历史记录 |
| GET | `/api/stats` | 统计（全部任务） |
| GET/PUT | `/api/settings` | 外观偏好（主题 / 卡片大小 / 紧凑模式 / 分组视图 / 背景 URL / 背景遮罩与卡片、面板不透明度，取值 0–1，1 为完全不透明） |
| POST | `/api/backgrounds` | 上传背景图片（multipart，≤8MB），返回 `{ url }` |
| GET/DELETE | `/api/backgrounds/{file}` | 读取 / 删除背景图片 |
| GET | `/api/holidays/{year}` | 法定节假日数据（放假「休」/ 调休「班」；服务端代理并缓存到 `data/holidays/{year}.json`，数据源 holiday-cn，年份非法 400 / 抓取失败且无缓存 502） |
| GET | `/api/export` | 导出全部数据为 JSON |
| POST | `/api/import` | 导入 JSON（覆盖现有全部数据；兼容含 `projects` 字段的旧备份） |

## 约定

- 所有面向用户的文案、种子数据与错误信息均为中文。
- 优先级为独立数据表（`priorities`）：每项含名称、颜色、权重（`level`，越大越优先）与排序
  （`position`），可在设置中自由增删改与排序；`Task.priority` 存的是优先级 `id`。默认三条为
  低/中/高（level 1/2/3），旧数据中的 `priority` 数值 1/2/3 仍与之一一对应。
- 时间以无时区的 UTC 存储，序列化时以 `Z` 结尾。
- **截止时间**精确到分（`YYYY-MM-DDTHH:MM`），逾期/即将到期按时间精确判定；旧数据只有日期时
  视为当天 23:59。启动时 `_normalize_due_dates()` 会把三种历史形态统一为 ISO 文本：纯日期
  `YYYY-MM-DD` → 当天 `T23:59:00`、秒级值截断到分钟、数字亲和性遗留值（如 `20260920235900`）
  补回分隔符。数字亲和性会让 SQLite 驱动在读行时直接抛错（保存任务 500 的根因），读路径另有
  `crud.as_datetime()` 兜底。历史快照中的 `due_date` 由 `_normalize_history_due_dates()` 同步清洗。
- 任务进入 `is_done=true` 的状态会自动写入 `completed_at`，移出时清空。
- 每个任务即一个独立条目，不再有「项目」层级；任务可归属一个可选的分组（分组可带一段纯文本备注）。
- **任务卡片颜色**为可选字段 `tasks.color`（NULL 表示按优先级取色）；旧数据库启动时由
  `ensure_schema()` 的 `_add_task_color()` 幂等补列；导出/导入备份包含颜色，旧备份无该字段则
  导入为 NULL。
- `Task.description` 存储**富文本 HTML**（含 base64 内嵌图片），后端按不透明字符串处理；
  卡片通过 `frontend/src/lib/sanitizeHtml.ts` 的 `sanitizeDescription()` 净化后渲染（去标签白名单
  之外的内容、且不显示图片）。
- 任务历史快照（`task_history`）中，状态/分组/标签以**名称**保存、描述**去除图片**，因此历史
  在关联实体改名/删除后仍可读。

更多开发与踩坑说明见 [AGENTS.md](./AGENTS.md)。
