# AGENTS.md

## Repo state
- Chinese-language task manager (任务管理系统). Backend and frontend are both implemented.
- `backend/` — FastAPI + SQLAlchemy/SQLite. All API code and tests live here.
- `frontend/` — React + TypeScript + Vite + Tailwind SPA. `npm run build` emits `frontend/dist`,
  which the API serves when present (`backend/app/main.py:45`), so build output must land there.
- `data/` — runtime SQLite DB (gitignored). `scripts/run.mjs` is the one-command launcher.
- `start.bat` (Windows, double-click) / `start.sh` (macOS/Linux) are thin wrappers around
  `npm run dev`: they check Node, install root deps once, then forward any args.
- `start-server.bat` + `server.env.example` are the **server-deploy** path: it reads `server.env`
  (gitignored), binds `APP_HOST` (default `0.0.0.0`) / `APP_PORT`, so the app is reachable from
  other machines. Keep it ASCII-only — `chcp 65001` + non-ASCII text breaks `cmd.exe` parsing.
- Git repo: branch `master`, remote `origin` = GitHub `task-manager`. Commit only when asked.

## Auth (required env vars)
- `backend/app/auth.py` implements single-account username+password auth with a stdlib-signed
  token (`base64url(payload).base64url(hmac_sha256)`) stored in an HttpOnly cookie. No extra deps.
- `TASK_APP_USERNAME` / `TASK_APP_PASSWORD` / `TASK_SECRET_KEY` are **required**: `main.py` calls
  `auth.require_config()` at import time and **exits** if any is missing. This means `pytest` and
  any local run must export all three, and existing tests will 401 without a logged-in client.
- `TASK_TOKEN_DAYS` (default 30) controls cookie/token lifetime. `TASK_SECRET_KEY` must stay stable
  or everyone is logged out on restart.
- Only `/api/*` is protected (`dependencies=[Depends(auth.require_auth)]` on every business router);
  `/api/auth/*` and `/api/health` stay open, and the SPA shell + `/assets/*` are intentionally
  public so the login page can load. Cookie is `httponly`/`samesite=lax`, **no `Secure`** because
  the supported deploy is plain http on an IP.
- Frontend: `src/store/auth.tsx` (`AuthProvider`) + `src/components/auth/LoginView.tsx`; `App.tsx`
  intercepts the whole app (no `/login` route — that would fight the SPA catch-all). `lib/api.ts`
  sends `credentials: 'include'` and calls `setUnauthorizedHandler` on any non-login 401.
  Logout lives in `src/components/settings/AccountSettings.tsx`. All new UI text is Chinese.

## Commands (Windows / PowerShell)
Repo root (one command; installs missing deps, builds the frontend, serves it from the API):
- `npm run dev` → http://127.0.0.1:8001 (`scripts/run.mjs`; no Vite/HMR). After starting uvicorn it
  auto-opens the default browser (skippable with `--no-open`).
- `npm start` (alias), `npm run build` (build only), `npm run serve` (serve without rebuild)
- `--port <n>` / env `PORT` overrides the API port.

Dependency freshness (all launchers): installs are no longer "exists → skip". Each entry point hashes
the manifest contents (`backend/requirements.txt`, `frontend/package-lock.json`, root `package.json`)
and compares against a `.deps-hash` marker stored **inside** the dependency dir
(`backend/.venv/.deps-hash`, `frontend/node_modules/.deps-hash`, root `node_modules/.deps-hash` — all
git-ignored). Mismatch → reinstall, then write the marker **only after** a successful install, so a
failed install never leaves a stale marker. `scripts/run.mjs` and `start-server.bat` MUST produce the
same hash for the same file: both key the digest on the path **relative to the repo root** with forward
slashes (`deps_hash.py` receives `backend\requirements.txt`; `run.mjs` uses `relative(root, absPath)`).
Changing one without the other makes the two launchers fight (each thinks the other is stale) and
reinstall on every switch. Node (`crypto`) and Python (`scripts/deps_hash.py`, stdlib `hashlib`) agree
byte-for-byte — verified `24e4fe…` for the current `requirements.txt`.

Backend, run from `backend/` (use the existing venv):
- Install deps: `.venv\Scripts\python -m pip install -r requirements.txt`
- Export `TASK_APP_USERNAME` / `TASK_APP_PASSWORD` / `TASK_SECRET_KEY` first, or `app.main`
  exits at import (see the Auth section).
- Dev API: `.venv\Scripts\python -m uvicorn app.main:app --reload` → http://127.0.0.1:8001
- All tests: `.venv\Scripts\python -m pytest`
- One test: `.venv\Scripts\python -m pytest tests/test_tasks.py::test_reorder_tasks`
- `pytest.ini` sets `pythonpath=.` and `testpaths=tests`; run pytest from `backend/`.
- No backend lint/format/typecheck config exists. Do not invent one.

E2E / manual verification (run from the repo root, uses the backend venv):
- `python scripts/e2e_server.py start [--port 8021] [--keep-db]` — boots a throwaway API on a temp
  DB (`%TEMP%\opencode\e2e-<port>.db`), serves the built `frontend/dist`, and returns in a few
  seconds. `stop` / `status` / `restart` also exist.
- `python scripts/e2e_seed.py --port 8021` — logs in over HTTP and creates its own `【E2E】` tasks
  (long rich-text description with an embedded image, 6 subtasks, one overdue). Idempotent; never
  deletes other rows.
- **Never** hand-roll `Start-Process`/`Invoke-WebRequest` loops for this. Two Windows traps have
  burned us repeatedly, both avoided by the Python launcher:
  - `Start-Process -RedirectStandardOutput` inherits the caller's console handles. uvicorn never
    exits, so the handles never close and the launching shell **blocks forever** even though the
    server is already up (looks like "卡死几分钟").
  - WMI `Win32_Process.Create` marshals its command line through ANSI; this repo's path contains
    Chinese (`任务管理系统`) and the system codepage is GBK (936), so the venv path is mangled into
    mojibake and the process dies silently with zero output.
  `subprocess.Popen(..., creationflags=DETACHED_PROCESS)` sidesteps both: Unicode args via
  `CreateProcessW`, no inherited handles, immediate return.
- Every `subprocess` call inside `e2e_server.py` must pass `creationflags=NO_WINDOW`
  (`CREATE_NO_WINDOW`). The script runs with no inheritable console, so each console-subsystem child
  (`powershell`, `taskkill`, `tasklist`, `netstat`) otherwise gets a **visible blank console window**
  — repeated `start`/`stop` cycles used to flash hundreds of them.
- Prefer the PID file over process enumeration: `start` writes `%TEMP%\opencode\e2e-<port>.pid` and
  `stop` kills that PID's tree (`taskkill /T`), so the normal path spawns **no** PowerShell at all.
  `find_uvicorn_pids()` (CIM) is only a fallback for leftovers with no PID file. Port lookups use
  `netstat -ano -p tcp`, not `Get-NetTCPConnection`.
- Always probe with an explicit timeout (`urllib` `timeout=`, or `Invoke-WebRequest -TimeoutSec`) —
  a bare `Invoke-WebRequest` waits indefinitely.
- uvicorn forks two processes (venv python + system python), so `Get-Process python` shows a pair.
  Always finish with `e2e_server.py stop` and confirm the count is 0.

Frontend, run from `frontend/`:
- Install deps: `npm install`
- Dev server: `npm run dev` → http://localhost:5173 (proxies `/api` → 127.0.0.1:8001)
- Build (typecheck + bundle): `npm run build` → `frontend/dist`
- Lint: `npm run lint` (oxlint; config in `.oxlintrc.json`)

## Backend facts easy to get wrong
- Importing `app.main` creates all tables and seeds defaults as a side effect: statuses
  待办/进行中/已完成. There is **no project concept** anymore.
- DB defaults to `data/tasks.db`; override with env `TASK_DB_PATH` (absolute path).
- `tests/conftest.py` sets `TASK_DB_PATH` + the three auth env vars to fixed values **before**
  importing the app, and an autouse fixture drops/recreates tables per test. The `client` fixture
  logs in (all `/api/*` is protected, so business tests need it); `anonymous_client` stays
  logged out for 401 checks. Preserve that import order if editing it.
- Datetimes are stored naive UTC and serialized with a trailing `Z` (`schemas._serialize_utc`).
  `Task.due_date` is the exception: a naive **wall-clock** datetime (no `Z`, `schemas.DueDatetime`),
  compared against `datetime.now(timezone.utc).replace(tzinfo=None)` in `stats.py`. Legacy date-only
  strings (`YYYY-MM-DD`) mean **23:59 that day** — enforced both by `schemas.parse_due` (on input) and
  `database._normalize_due_dates()` (rewrites existing rows to `T23:59:00`). Overdue/due-soon are
  time-precise; the SQLite `DATE` column holds datetimes without a schema change.
- **`due_date` must never be read raw**: SQLite keeps it as TEXT and its *affinity* decides what
  SQLAlchemy hands back. A numeric-affinity legacy value (`20260920235900`) makes the driver raise
  `TypeError: fromisoformat: argument must be str` **while loading the row** — before any CRUD code
  runs, which is what produced the "保存任务 500" bug. Two independent guards exist, keep both:
  `database._normalize_due_dates()` (boot-time migration: numeric → ISO text, `YYYY-MM-DD` → `T23:59:00`,
  seconds → truncated to the minute; idempotent) and `crud.as_datetime()` (read/write-path fallback for
  `datetime`/`date`/ISO string/`YYYYMMDDHHMMSS`). `crud` normalizes its own outputs through
  `as_datetime()` so history snapshots stay minute-precision; `_normalize_history_due_dates()` cleans
  the JSON `"due_date"` fragment inside `task_history.snapshot`.
- `Task` has `created_at` (insert), `updated_at` (SQLAlchemy `onupdate=utcnow`, auto), `completed_at`.
- `Task.priority` is an int (a **`priorities.id`**, not a fixed 1/2/3) with no range validation; the
  value must reference an existing `priorities` row or the write returns 404. `Priority` rows carry
  `name/color/level/position`; `level` is the weight (higher = more important) and `position` is the
  display order. Default three are seeded 低/中/高 with level 1/2/3 and ids 1/2/3, so legacy
  `tasks.priority` values still map correctly.
- `Task.description` stores **HTML** (rich text from the frontend); the API treats it as an opaque
  string (no validation/sanitization). Plain-text consumers use `frontend/src/lib/richText.ts`.
- Moving a task to a status with `is_done=True` auto-sets `completed_at`; moving off clears it.
- Creating a task with no `status_id` assigns the first status by `position`; position is now global
  (`crud.next_task_position(db)`, no project scoping). No `priority` assigns the first priority by
  position (`crud.resolve_priority`).
- API is under `/api/*`; subtask routes share the `/api/tasks` prefix. Group routes are `/api/groups`,
  priority routes are `/api/priorities`. Holiday routes are `/api/holidays/{year}` (proxy + cache).
- `PUT /api/tasks/{id}/move` uses `exclude_unset` semantics: `group_id: null` **clears** the group,
  omitting `group_id` leaves it unchanged (the frontend cross-group drag relies on this).
- Deleting a group keeps its tasks but sets `group_id` to NULL (SQLAlchemy nulls the FK on delete).
  `Group.note` is an optional plain-text note shown under the group header.
- Deleting an in-use status/priority returns 400 (a priority that is the last remaining one also 400);
  duplicate status/tag/group/priority names return 409.
- All user-facing strings, seed data, and error messages are Chinese — keep new UI/messages Chinese.
- Frontend UI refactor uses a shared dual-theme design system: `--c-canvas` / `--c-surface` /
  `--c-elevated` define surface layers, `--shadow-sm` / `--shadow-md` / `--shadow-lg` define
  elevation, and controls use consistent rounded corners and focus rings. Keep new UI aligned with
  these tokens instead of introducing one-off colors, shadows, or radii.
- Appearance preferences are a single `preferences` row (id=1) served by `/api/settings`; background
  files live in `DB_DIR/backgrounds/` (i.e. next to the SQLite file, so tests use the temp dir).
   Opacity prefs    Opacity prefs `bg_opacity`/`card_opacity`/`panel_opacity` (0–1, **不透明度**: 0 = 全透明, 1 = 完全
   不透明) drive CSS vars `--app-bg-scrim`, `--app-card-alpha`, `--app-panel-alpha`. `--app-card-alpha`
   is the **final** alpha of `.note-surface-*` (便签卡片) and of `.app-surface-canvas` /
   `.app-surface-elevated` (任务脉络内的泳道格与任务条) — do not re-introduce per-priority alpha
   multipliers, tints differ by hue only. `--app-panel-alpha` only affects `.app-chrome` / `.app-surface-panel`
   (顶栏/侧栏/任务脉脉络外层面板, 仅在设置了背景图时生效). Buttons, dropdown menus, badges and selected
    states must stay solid (`.bg-accent-soft` is redefined as a solid color-mix) so the sliders never
    make them semi-transparent. 图标按钮/工具按钮统一用 `rounded border border-line bg-surface` 实心底色
   （含看板工具栏、脉络工具栏、列表操作列、设置页操作按钮、富文本工具栏、任务卡与子任务行内按钮）。
- Group sections on `/board` and `/list` must be ordered by `group.position` (未分组 fixed last):
  分组拖动排序只更新 `group.position`，若 sections 仍按任务出现顺序生成，拖动分组就不会有任何可见效果。
- Schema migrations live in `database.ensure_schema()` (called from `main.py` after `create_all`):
  it adds new `preferences` columns (`compact`, `group_by`, `bg_opacity`, `card_opacity`,
  `panel_opacity`), runs `_drop_projects()` (rebuilds `tasks` without `project_id`, drops the
  `projects` table, preserving every task row), `_add_task_group()` (adds `tasks.group_id` + index),
  `_add_task_color()` (adds `tasks.color` VARCHAR(20), NULL = 按优先级取色), `_add_group_note()`
  (adds `groups.note`), `_normalize_due_dates()` (numeric-affinity → ISO text, legacy date-only
  `due_date` → `T23:59:00`, seconds truncated to the minute) and `_normalize_history_due_dates()`
  (same rewrite for the JSON `"due_date"` fragment inside `task_history.snapshot`). The `priorities`
  table is created by `create_all` and seeded by
  `seed.seed_defaults`. `create_all` never drops columns/tables, so rebuild-style migrations must stay
  idempotent.
- `/api/export` dumps all data; `POST /api/import` **wipes and replaces** statuses/tags/groups/
  priorities/tasks (legacy payloads still containing `projects`/`project_id` are accepted and ignored;
  a legacy payload with no `priorities` re-seeds the default three and keeps task priority values;
  a payload whose tasks have no `color` imports them with NULL color).
  Export/import deliberately **exclude appearance preferences** (`preferences`) and background files.
- `Task.color` (VARCHAR(20), nullable) is the card custom color: NULL = 按优先级取便签底色。
  Frontend resolves it via `src/lib/taskColor.ts` (`taskColor()`: 自定义色优先，深色下过暗自动提亮，
  空值回落优先级色) and renders custom colors through `.note-surface-custom` (inline `--card-tint`
  + `color-mix`, alpha still follows `--app-card-alpha`). History snapshots do NOT record color.
- Groups are a first-class entity (`groups` table, `/api/groups` CRUD + `/reorder`); a task has an
  optional `group_id`. Priorities are likewise first-class (`priorities` table, `/api/priorities`
  CRUD + `/reorder`). The board/list/mindmap "group by" toggle is persisted as `preferences.group_by`.
- `task_history` stores JSON snapshots (`TaskHistory.task_id` FK CASCADE, `snapshot` TEXT). A snapshot
  is written on task **create** (v1) and from `crud.update_task` only when a main field actually
  changed; `build_history_snapshot` stores **names** (status/group/tags) and strips `<img>` from
  the description. Routes: `GET /api/tasks/{id}/history` (newest first, schema deserializes the JSON),
  `DELETE /api/tasks/{id}/history/{history_id}`. History is included in export/import.

## E2E / verification safety
- **Never** run a script that deletes all tasks against the real `data/tasks.db` — this has destroyed
  user data before. Start the API with `TASK_DB_PATH` pointing to a temp file for E2E runs, and make
  scripts delete only the rows they created.

## Frontend facts easy to get wrong
- Stack: React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 3.4, TanStack Query v5, react-router-dom,
  @dnd-kit (task card grid drag-reorder), lucide-react, ECharts 6 (on-demand + lazy). All UI text is Chinese.
- Theme colors are **CSS variables** in `src/index.css` (`--c-*`, `--shadow-panel`, plus sticky-note
  tokens `--c-note-base/low/medium/high` and `--shadow-note`), consumed by `tailwind.config.js` as
  `rgb(var(--c-x) / <alpha-value>)` (`note.base/low/medium/high`, `shadow-note`). Light mode = `.light`
  class on `<html>` overriding those vars; there is no `dark:` variant and no hardcoded hex in the config.
- Appearance preferences (theme dark/light/system, card size sm/md/lg, background image, and the
  three opacity sliders `bgOpacity`/`cardOpacity`/`panelOpacity`) live in `src/store/preferences.tsx`,
  persisted to `localStorage` key `task-manager:preferences`; opacity values are written to `:root` as
  `--app-bg-scrim`/`--app-card-alpha`/`--app-panel-alpha`.
  `index.html` has an inline script that applies theme/background/opacity before React to avoid a flash.
- Routes: `/board`, `/list`, `/calendar`, `/dashboard`, `/settings` (all wrapped by `AppShell`). There is
  no `/projects` route or project UI anymore.
- `/board` is a **sticky-note wall**: a responsive card grid where cards tilt slightly and are tinted
  by priority (`noteSurfaceClassFor`/`noteTilt` in `src/lib/priority.ts` + `src/lib/utils.ts`); hover
  straightens the card. The note tone maps each priority to 低/中/高三档 by its `level`
   (`note-surface-{low,medium,high}` classes in `index.css`, whose alpha **is** `--app-card-alpha`;
   100% 即实心，三档只差色相). 任务脉脉络内的泳道格与任务条用 `.app-surface-canvas`/`.app-surface-elevated`，
   同样跟随 `--app-card-alpha`；脉脉络**外层面板**用 `.app-surface-panel`（跟顶栏/侧栏）；不要再用
   `bg-canvas/30`、`bg-elevated/40` 之类硬编码透明度。
   `Button` 的基础类含 `shrink-0 whitespace-nowrap`：按钮文案不可折行，否则 `h-7` 的小按钮会溢出。
  Cards show title/description/status/priority/due/tags/subtasks **and created/updated timestamps**.
  The sidebar is an off-canvas drawer, hidden by default (`ui.sidebarOpen`); the topbar's `PanelLeft`
  button toggles it.
- **Priorities are data-driven**: `usePriorities()` (query key `priorities`) + `usePrioritiesMeta()`
  (`src/hooks/usePrioritiesMeta.ts`) expose `{ priorities, sorted, byId, label, color }`, falling back
  to `FALLBACK_PRIORITIES` (`src/lib/priority.ts`) while loading. Use these instead of any hardcoded
  label/color map. `PriorityManager.tsx` (settings page) does CRUD by name/color/level + up/down reorder.
- The board's top section is **`TaskMindMap`** (five switchable views, all lazy-loaded):
  `sankey` (default) / `radial` / `tree` / `swimlane` (ECharts/SVG/CSS) / `score` (评分柱状图,
  CSS-based in `ScoreBoardView.tsx` — no ECharts).
  The view choice is persisted to `localStorage` key `task-manager:mindmap-view`, and the
  collapse state to `task-manager:mindmap-collapsed`.
- Chart data is built by pure functions in `src/lib/mindmap.ts` over `Task[]` + `Status[]` +
  `Priority[]` (`buildTreeData` / `buildSunburstData` / `buildSankeyData` / `buildSwimlaneData` /
  `buildScoreBoardData`); there is **no backend endpoint**. The score view ranks non-archived tasks by
  a **strictly layered** weight `groupWeight × taskSpan × prioritySpan + taskWeight × prioritySpan + level`,
  where the order index is inverted (`total - order + 1`) so **越靠前分数越高**；`taskSpan`/`prioritySpan`
  are computed from the actual max task count / max priority level so later groups or large levels can
  never bleed across layers. 未分组固定最低权重、排在所有分组之后。Bar color is the **task's group
  color** (`task.group.color`; 未分组 → neutral gray `rgb(var(--c-line-strong))`), washed out with
  `color-mix(in srgb, <groupColor> 55%, rgb(var(--c-surface)))` so bars stay readable in both themes
  and never depend on the background image. 柱高 `h-5`（20px）、列表 `space-y-1`。Bar width is
  `score / (maxScore * 1.25)`, so the longest
  bar sits at ~80% and never touches the right edge. 树/旭日/桑基的
  (priority→status) 分支内任务仍按 `taskScore()` = 优先级 `level` + 最近更新权重
  （`PRIORITY_FACTOR`/`RECENCY_FACTOR`）排序，并截断到 `BRANCH_LIMIT`（8），其余折叠为
  「还有 N 个…」节点——与评分柱状图是两套不同的打分逻辑，不要混淆。
- **ECharts is registered on demand** in `src/lib/echarts.ts` (only Sankey/Sunburst/Tree + Tooltip
  + CanvasRenderer) and the views are **lazy-loaded** via `React.lazy` in `TaskMindMap.tsx`, so the
  initial bundle stays ~130KB gzip and ECharts sits in its own async chunk. Keep it that way: do
  not import `echarts` eagerly, and never `import * as echarts from 'echarts'` (full build).
- `MindMapChart.tsx` owns `echarts.init`/`dispose`, `ResizeObserver`, and the click handler
  (task nodes are matched by `data.taskId` or an `id` of the form `task-<id>`).
- Sankey node names must be unique: they use composite ids (`root::all`, `priority::N`,
  `status::N-ID`, `task::ID`, `more::N-ID`) while the visible text comes from a `display` field
  (so `label.formatter` reads `params.data.display`).
- `lib/chartTheme.ts` provides `chartPalette(isDark)` / `chartTooltipStyle` / `withAlpha` /
  `isDarkColor` / `priorityColorMap(priorities, isDark)`. `TaskMindMap` builds the palette once and
  passes it to each lazy view (they no longer call `chartPalette` themselves); the map is rebuilt on
  `priorities`/`resolvedTheme` change. Do not reintroduce hardcoded hex colors or `priorityColor()`.
- Sankey / tree / sunburst all render **task titles on canvas** (truncated, full text in the
  tooltip); swimlane renders them as chips with overdue / subtask-progress signals.
- `/calendar` (菜单「日历」) is a **lazy-loaded** page (`React.lazy` in `App.tsx`, own chunk).
  `CalendarView.tsx` 提供月/周视图切换、翻页、**鼠标滚轮翻页**、回到今天，复用顶部筛选（优先级/标签/搜索），
  默认排除已归档任务。任务**仅按 `due_date` 落格**（`src/lib/calendar.ts` 的 `groupTasksByDay`），
  每个日期格显示公历日 + 农历/节气/传统节日（`src/lib/lunar.ts` 封装 `lunar-javascript`，本地离线计算，
  周一为一周起始）、节假日「休/班」角标，以及当天任务数 `done/total` 与完成度着色
  （全完成绿/进行中黄/含逾期红/待开始蓝）；格内任务条按 `taskColor()` 着色、逾期任务带红色左边条。
  点击日期弹出 `DayTasksPanel`（当天任务列表 + 「新建」入口，
  新建时通过 `ui.openCreate(null, dueDate)` 预填该日 23:59 的截止时间）。
  **滚轮翻页实现要点**：只在日期网格区挂原生 `wheel` 监听（`{ passive: false }` + `preventDefault`
  + 累计阈值 `WHEEL_THRESHOLD` 与冷却 `WHEEL_COOLDOWN_MS` 节流），React 的 `onWheel` 是 passive 无法阻止
  页面滚动，所以必须用 `addEventListener`；监听挂在网格 ref 上而非 `window`，工具栏/图例区域仍可正常滚动。
- 节假日数据（放假「休」/调休「班」）来自后端 `GET /api/holidays/{year}`（`routers/holidays.py`，
  数据源 `NateScarlet/holiday-cn`，MIT）：优先读缓存 `DB_DIR/holidays/{year}.json`，未命中则依次尝试
  jsDelivr / fastly / raw.githubusercontent 镜像抓取并写缓存；年份非法 400，全部失败且无缓存 502，
  前端 `useHolidays` 会静默降级（不显示休/班角标，其余功能正常）。因 12 月可能由次年文件决定，
  前端同时请求当年与次年数据合并。`holiday-cn` 的周末不视为法定节假日。
  `holidays._normalize()` 必须**同时兼容 `isOffDay`（源站驼峰）和 `is_off_day`（缓存里的
  归一化字段）**：写回缓存的是下划线字段，二次读取若只认驼峰会取到 None，`bool(None)` 让所有
  节假日被误判为「班」（`tests/test_holidays.py` 锁定该回归）。
- Drag-reorder only works when board sort is `position` (手动排序); other sorts disable drag.
  Dragging uses an explicit `GripVertical` handle (`SortableTaskCard`), not the whole card, and
  is also disabled while the list is truncated by the 60-per-page "显示更多" pagination.
  In the grouped board (`GroupedTaskBoard.tsx`, used when `groupBy` is on) each group is its own
  `SortableContext` + droppable container; same-group drops reorder via `/reorder`, cross-group
  drops call `/move` with `group_id`+`position` then re-flatten positions. Group headers carry a
  `GripVertical` handle that reorders the groups themselves via an outer `SortableContext` +
  `/api/groups/reorder` (the "未分组" section is fixed last and not draggable). The same reorder is
  available in `GroupManager.tsx`.
- `GroupedTaskBoard` uses **one** shared `DndContext` for both task cards and group headers (a
  nested inner/outer pair silently swallowed group drags — the outer context never saw them).
  `handleDragEnd` dispatches on the id prefix: `group:*` → `handleGroupDragEnd`, otherwise a task
  drop. Group sortables must be namespaced as `group:<id>`.
- Two dnd-kit gotchas in `GroupedTaskBoard` that are easy to re-break:
  - Group-level sortable ids are namespaced (`group:<id>`); **never** use the raw numeric
    `groupId` — it collides with `task.id` in the same DndContext and silently replaces the card's
    measured rect (dropping a card then resolves `over` to the whole group).
  - The task drag context uses a custom `taskCollisionDetection` (in both `GroupedTaskBoard` and
    `BoardView`): top strip (`section-start:`) wins first, then the card **nearest the pointer**
    (not the dragged-rect center), then the group container, falling back to `rectIntersection`.
    That is what makes "drag a card to the first position" work — plain `closestCenter` can never
    hit the thin strip because it compares rect centers.
  - Cross-group moves must remove the task from the source list before flattening, otherwise the
    task id appears twice in the `/reorder` payload and corrupts the order.
- Group headers (`GroupedTaskBoard`) and the list's group rows render `section.note` under the title
  when set; the note is edited in `GroupManager.tsx`.
- `Task.description` is HTML. The drawer edits it with the dependency-free `RichTextEditor`
  (`contentEditable` + `document.execCommand`, image paste/drop as base64 data URLs, toolbar in
  `src/components/ui/RichTextEditor.tsx`). Cards render the description as **sanitized HTML** via
  `sanitizeDescription()` (`src/lib/sanitizeHtml.ts`, whitelist tags/attrs, images stripped), always
  (both 宽松/紧凑). Never inject `task.description` without sanitizing. `htmlToText()` in
  `src/lib/richText.ts` remains for any plain-text needs.
- Card grid (宽松 mode, `compact === false`) lists up to 5 subtasks with working checkboxes and a
  "还有 N 个" line; toggling uses `useUpdateSubtask` wired through `BoardView` → `SortableTaskCard` /
  `GroupedTaskBoard`. Card subtasks are **toggle-only** (no rename/delete there).
- Due dates are date **and time** (`YYYY-MM-DDTHH:MM`). `src/lib/utils.ts` has `parseDue()`
  (legacy date-only ⇒ 23:59) / `formatDue()` and `dueState()` compares against `Date.now()` precisely;
  never go back to raw string comparison. Inputs are `<input type="datetime-local">` in
  `TaskDetailDrawer`/`TaskForm`; the drawer trims the stored value with `toDatetimeLocal()`.
- Subtask titles are edited **inline only in the drawer** (`SubTaskList.tsx`): click the title (or the
  pencil) → `Input`, Enter/blur saves (`useUpdateSubtask({ title })`), Esc cancels. The backend PUT
  already supported `title`; keep card subtasks read-only.
- The detail drawer has a collapsible **历史修改** timeline (`TaskHistoryTimeline`, default open) fed by
  `useTaskHistory`; each entry can be deleted via `ConfirmDialog`. Do not add a revert action (display
  only by design).
- There is **no edit modal**: `TaskForm` is create-only. Clicking a card / the row pencil / card
  pencil opens `TaskDetailDrawer`, where all fields (title/status/priority/group/due/tags/
  description) are staged in a local draft and only persisted by the footer 保存 button; closing
  with unsaved changes prompts. Archive/restore and delete both go through `ConfirmDialog`.
- The **board** card body and the card pencil go to *different* places: the body opens the read-only
  `TaskPreviewModal` (放大版卡片), the pencil opens the editable `TaskDetailDrawer`. They are wired
  through separate props on `TaskCard` (`onPreview` vs `onOpen`; `onPreview ?? onOpen` is the
  fallback so list/mindmap callers that pass only `onOpen` keep working). State lives in
  `ui.previewTaskId` / `openPreview` / `closePreview`, deliberately separate from `selectedTaskId`.
  The preview renders the description with `sanitizeDescription(..., { allowImages: true })` (cards
  pass `false`), lists **all** subtasks with working checkboxes (`useUpdateSubtask`), and keeps every
  other field read-only. Its 编辑 button must call `closePreview()` **before** `openTask()` so the
  `Modal` (z-50) and `Drawer` (z-40) never stack.
- The preview header does **not** reuse the card's sticky-note colors. `note-surface-{low,medium,high}`
  is tuned for small cards and, at 768px wide, a full-strength tint (dark mode `--c-note-high` =
  `rgb(160 58 58)`) collides with the `bg-surface` body — and it had no `border-radius`, so the header's
  square corners poked past the dialog's `rounded-xl`. Instead `priority.ts` exports `previewTintStyle()`
  (tint from `taskColor()`, 已完成/已归档 → neutral gray) which only sets the inline `--preview-tint`,
  and `index.css` defines `.preview-tint` as `color-mix(--preview-tint N%, rgb(var(--c-surface)))` —
  18% dark / 10% light (`:root.light` override) — plus `border-radius: inherit`. Keep the two systems
  separate; do not swap the preview back to `cardSurfaceStyle()`. The header also uses `-mt-px` (not
  `-mt-4`) so its bottom border sits flush on the scroll container's top edge while scrolling.
- `Modal` takes a `scrollable` prop: it caps the dialog at `max-h-[78vh]`, makes the body
  `min-h-0 flex-1 overflow-y-auto`, and keeps `footer` pinned. Use it whenever content can be long —
  without it the dialog grows past the viewport and the footer scrolls out of reach.
- Card density/size come from `CARD_SIZE_STYLES` in `src/store/preferences.tsx` (padding/title/
  desc lines/gap), plus a `compact` preference; both are persisted server-side. Cards show
  description + subtask progress only in 宽松 mode (`compact === false`).
- Group management is a modal (`GroupManager.tsx`) opened from the board toolbar (`Settings2`
  button, `ui.openGroups`), not from the settings page.
- Vite dev server binds to `localhost` only, not `127.0.0.1` — open http://localhost:5173.
- `npm run build` runs `tsc -b` with `verbatimModuleSyntax` + `erasableSyntaxOnly` + `noUnusedLocals`:
  type-only imports must use `import type`, and TS enums are disallowed.
- oxlint emits `react(set-state-in-effect)` warnings for the modal/drawer init patterns — expected.
- Server state goes through `src/hooks/queries.ts` (query keys + invalidation); API wrapper is
  `src/lib/api.ts`; global UI state (filters, open modals) is `src/store/ui.tsx`.

## Conventions
- Parent `../CLAUDE.md` instructs: when anything is unclear, ask the user until satisfied instead of
  assuming. Honor this before large changes.
