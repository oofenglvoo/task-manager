# AGENTS.md

## Repo state
- Chinese-language task manager (任务管理系统). Backend and frontend are both implemented.
- `backend/` — FastAPI + SQLAlchemy/SQLite. All API code and tests live here.
- `frontend/` — React + TypeScript + Vite + Tailwind SPA. `npm run build` emits `frontend/dist`,
  which the API serves when present (`backend/app/main.py:45`), so build output must land there.
- `data/` — runtime SQLite DB (gitignored). `scripts/run.mjs` is the one-command launcher.
- Git repo: branch `master`, remote `origin` = GitHub `task-manager`. Commit only when asked.

## Commands (Windows / PowerShell)
Repo root (one command; installs missing deps, builds the frontend, serves it from the API):
- `npm run dev` → http://127.0.0.1:8001 (`scripts/run.mjs`; no Vite/HMR). After starting uvicorn it
  auto-opens the default browser (skippable with `--no-open`).
- `npm start` (alias), `npm run build` (build only), `npm run serve` (serve without rebuild)
- `--port <n>` / env `PORT` overrides the API port.

Backend, run from `backend/` (use the existing venv):
- Install deps: `.venv\Scripts\python -m pip install -r requirements.txt`
- Dev API: `.venv\Scripts\python -m uvicorn app.main:app --reload` → http://127.0.0.1:8001
- All tests: `.venv\Scripts\python -m pytest`
- One test: `.venv\Scripts\python -m pytest tests/test_tasks.py::test_reorder_tasks`
- `pytest.ini` sets `pythonpath=.` and `testpaths=tests`; run pytest from `backend/`.
- No backend lint/format/typecheck config exists. Do not invent one.

Frontend, run from `frontend/`:
- Install deps: `npm install`
- Dev server: `npm run dev` → http://localhost:5173 (proxies `/api` → 127.0.0.1:8001)
- Build (typecheck + bundle): `npm run build` → `frontend/dist`
- Lint: `npm run lint` (oxlint; config in `.oxlintrc.json`)

## Backend facts easy to get wrong
- Importing `app.main` creates all tables and seeds defaults as a side effect: statuses
  待办/进行中/已完成. There is **no project concept** anymore.
- DB defaults to `data/tasks.db`; override with env `TASK_DB_PATH` (absolute path).
- `tests/conftest.py` sets `TASK_DB_PATH` to a temp dir **before** importing the app, and an
  autouse fixture drops/recreates tables per test. Preserve that import order if editing it.
- Datetimes are stored naive UTC and serialized with a trailing `Z` (`schemas._serialize_utc`).
  `Task.due_date` is the exception: a naive **wall-clock** datetime (no `Z`, `schemas.DueDatetime`),
  compared against `datetime.now(timezone.utc).replace(tzinfo=None)` in `stats.py`. Legacy date-only
  strings (`YYYY-MM-DD`) mean **23:59 that day** — enforced both by `schemas.parse_due` (on input) and
  `database._normalize_due_dates()` (rewrites existing rows to `T23:59:00`). Overdue/due-soon are
  time-precise; the SQLite `DATE` column holds datetimes without a schema change.
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
  priority routes are `/api/priorities`.
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
  (adds `groups.note`) and `_normalize_due_dates()` (rewrites legacy date-only
  `due_date` to `T23:59:00`). The `priorities` table is created by `create_all` and seeded by
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
- Routes: `/board`, `/list`, `/dashboard`, `/settings` (all wrapped by `AppShell`). There is no
  `/projects` route or project UI anymore.
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
  `groupOrder × GROUP_ORDER_FACTOR + taskOrder × TASK_ORDER_FACTOR + priorityLevel × SCORE_PRIORITY_FACTOR`
  (分组顺序 > 组内顺序 > 优先级等级); `taskOrder` is the task's index within its group under the current
  `position` sort. Bar colors come from `taskColor()` (custom color → priority tint). 树/旭日/桑基的
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
- Drag-reorder only works when board sort is `position` (手动排序); other sorts disable drag.
  Dragging uses an explicit `GripVertical` handle (`SortableTaskCard`), not the whole card, and
  is also disabled while the list is truncated by the 60-per-page "显示更多" pagination.
  In the grouped board (`GroupedTaskBoard.tsx`, used when `groupBy` is on) each group is its own
  `SortableContext` + droppable container; same-group drops reorder via `/reorder`, cross-group
  drops call `/move` with `group_id`+`position` then re-flatten positions. Group headers carry a
  `GripVertical` handle that reorders the groups themselves via an outer `SortableContext` +
  `/api/groups/reorder` (the "未分组" section is fixed last and not draggable). The same reorder is
  available in `GroupManager.tsx`.
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
