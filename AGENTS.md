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
- `npm run dev` → http://127.0.0.1:8000 (`scripts/run.mjs`; no Vite/HMR)
- `npm start` (alias), `npm run build` (build only), `npm run serve` (serve without rebuild)
- `--port <n>` / env `PORT` overrides the API port.

Backend, run from `backend/` (use the existing venv):
- Install deps: `.venv\Scripts\python -m pip install -r requirements.txt`
- Dev API: `.venv\Scripts\python -m uvicorn app.main:app --reload` → http://127.0.0.1:8000
- All tests: `.venv\Scripts\python -m pytest`
- One test: `.venv\Scripts\python -m pytest tests/test_tasks.py::test_reorder_tasks`
- `pytest.ini` sets `pythonpath=.` and `testpaths=tests`; run pytest from `backend/`.
- No backend lint/format/typecheck config exists. Do not invent one.

Frontend, run from `frontend/`:
- Install deps: `npm install`
- Dev server: `npm run dev` → http://localhost:5173 (proxies `/api` → 127.0.0.1:8000)
- Build (typecheck + bundle): `npm run build` → `frontend/dist`
- Lint: `npm run lint` (oxlint; config in `.oxlintrc.json`)

## Backend facts easy to get wrong
- Importing `app.main` creates all tables and seeds defaults as a side effect: statuses
  待办/进行中/已完成. There is **no project concept** anymore.
- DB defaults to `data/tasks.db`; override with env `TASK_DB_PATH` (absolute path).
- `tests/conftest.py` sets `TASK_DB_PATH` to a temp dir **before** importing the app, and an
  autouse fixture drops/recreates tables per test. Preserve that import order if editing it.
- Datetimes are stored naive UTC and serialized with a trailing `Z` (`schemas._serialize_utc`).
- `Task` has `created_at` (insert), `updated_at` (SQLAlchemy `onupdate=utcnow`, auto), `completed_at`.
- `priority` is an int 1/2/3 (low/medium/high), validated 1–3.
- Moving a task to a status with `is_done=True` auto-sets `completed_at`; moving off clears it.
- Creating a task with no `status_id` assigns the first status by `position`; position is now global
  (`crud.next_task_position(db)`, no project scoping).
- API is under `/api/*`; subtask routes share the `/api/tasks` prefix.
- Deleting an in-use status returns 400; duplicate status/tag names return 409.
- All user-facing strings, seed data, and error messages are Chinese — keep new UI/messages Chinese.
- Appearance preferences are a single `preferences` row (id=1) served by `/api/settings`; background
  files live in `DB_DIR/backgrounds/` (i.e. next to the SQLite file, so tests use the temp dir).
- Schema migrations live in `database.ensure_schema()` (called from `main.py` after `create_all`):
  it adds new `preferences` columns (`compact`) **and** runs `_drop_projects()`, which rebuilds
  `tasks` without `project_id` and drops the `projects` table while preserving every task row.
  `create_all` never drops columns/tables, so rebuild-style migrations must stay idempotent.
- `/api/export` dumps all data; `POST /api/import` **wipes and replaces** statuses/tags/tasks
  (legacy payloads still containing `projects`/`project_id` are accepted and ignored).

## E2E / verification safety
- **Never** run a script that deletes all tasks against the real `data/tasks.db` — this has destroyed
  user data before. Start the API with `TASK_DB_PATH` pointing to a temp file for E2E runs, and make
  scripts delete only the rows they created.

## Frontend facts easy to get wrong
- Stack: React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 3.4, TanStack Query v5, react-router-dom,
  @dnd-kit (task card grid drag-reorder), lucide-react. All UI text is Chinese.
- Theme colors are **CSS variables** in `src/index.css` (`--c-*`, `--shadow-panel`, plus sticky-note
  tokens `--c-note-base/low/medium/high` and `--shadow-note`), consumed by `tailwind.config.js` as
  `rgb(var(--c-x) / <alpha-value>)` (`note.base/low/medium/high`, `shadow-note`). Light mode = `.light`
  class on `<html>` overriding those vars; there is no `dark:` variant and no hardcoded hex in the config.
- Appearance preferences (theme dark/light/system, card size sm/md/lg, background image) live in
  `src/store/preferences.tsx`, persisted to `localStorage` key `task-manager:preferences`.
  `index.html` has an inline script that applies theme/background before React to avoid a flash.
- Routes: `/board`, `/list`, `/dashboard`, `/settings` (all wrapped by `AppShell`). There is no
  `/projects` route or project UI anymore.
- `/board` is a **sticky-note wall**: a responsive card grid where cards tilt slightly and are tinted
  by priority (`noteSurfaceClass`/`noteTilt` in `src/lib/utils.ts`); hover straightens the card.
  `BoardSummary` renders the top overview (number cards + status/priority bars + today/overdue).
  Cards show title/description/status/priority/due/tags/subtasks **and created/updated timestamps**.
  The sidebar is an off-canvas drawer, hidden by default (`ui.sidebarOpen`); the topbar's `PanelLeft`
  button toggles it.
- Drag-reorder only works when board sort is `position` (手动排序); other sorts disable drag.
  Dragging uses an explicit `GripVertical` handle (`SortableTaskCard`), not the whole card, and
  is also disabled while the list is truncated by the 60-per-page "显示更多" pagination.
- Card density/size come from `CARD_SIZE_STYLES` in `src/store/preferences.tsx` (padding/title/
  desc lines/gap), plus a `compact` preference; both are persisted server-side.
- Vite dev server binds to `localhost` only, not `127.0.0.1` — open http://localhost:5173.
- `npm run build` runs `tsc -b` with `verbatimModuleSyntax` + `erasableSyntaxOnly` + `noUnusedLocals`:
  type-only imports must use `import type`, and TS enums are disallowed.
- oxlint emits `react(set-state-in-effect)` warnings for the modal/drawer init patterns — expected.
- Server state goes through `src/hooks/queries.ts` (query keys + invalidation); API wrapper is
  `src/lib/api.ts`; global UI state (filters, open modals) is `src/store/ui.tsx`.

## Conventions
- Parent `../CLAUDE.md` instructs: when anything is unclear, ask the user until satisfied instead of
  assuming. Honor this before large changes.
