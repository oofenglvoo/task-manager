import os
import re
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = os.environ.get("TASK_DB_PATH", str(DATA_DIR / "tasks.db"))
DB_DIR = Path(DB_PATH).resolve().parent
DATABASE_URL = f"sqlite:///{Path(DB_PATH).as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


class Base(DeclarativeBase):
    pass


def ensure_schema() -> None:
    """Apply migrations that create_all cannot handle (new columns, dropped ones)."""
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(preferences)")
        }
        if columns and "compact" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE preferences ADD COLUMN compact BOOLEAN NOT NULL DEFAULT 0"
            )
        if columns and "group_by" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE preferences ADD COLUMN group_by BOOLEAN NOT NULL DEFAULT 0"
            )
        if columns and "bg_opacity" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE preferences ADD COLUMN bg_opacity FLOAT NOT NULL DEFAULT 0.7"
            )
        if columns and "card_opacity" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE preferences ADD COLUMN card_opacity FLOAT NOT NULL DEFAULT 1.0"
            )
        if columns and "panel_opacity" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE preferences ADD COLUMN panel_opacity FLOAT NOT NULL DEFAULT 0.82"
            )
        _drop_projects(connection)
        _add_task_group(connection)
        _add_task_color(connection)
        _add_group_note(connection)
        _normalize_due_dates(connection)
        _normalize_history_due_dates(connection)


def _normalize_due_dates(connection) -> None:
    """Rewrite legacy `tasks.due_date` values to ISO text at minute precision.

    三种历史形态（`due_date` 早期是 DATE、后来是秒级 DATETIME）：

    - `YYYY-MM-DD`（10 字符）        → `YYYY-MM-DDTHH:MM:SS`，即当天 23:59
    - `YYYY-MM-DDTHH:MM:SS`（19）    → 截断到分钟
    - 数字亲和性值（`20260920235900`）→ CAST 回文本并补回分隔符

    最后一种会让 SQLite 把列亲和性判成 NUMERIC，SQLAlchemy 的 datetime
    处理器随后拿到 int/float 并抛 `TypeError: fromisoformat: argument must be
    str` —— 这正是保存任务时 500 的根因。

    幂等：已经是 `YYYY-MM-DDTHH:MM` 形式的值不会被再改。
    """
    task_columns = {
        row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")
    }
    if not task_columns or "due_date" not in task_columns:
        return
    connection.exec_driver_sql(
        "UPDATE tasks SET due_date = "
        "SUBSTR(CAST(due_date AS TEXT), 1, 4) || '-' || "
        "SUBSTR(CAST(due_date AS TEXT), 5, 2) || '-' || "
        "SUBSTR(CAST(due_date AS TEXT), 7, 2) || 'T' || "
        "SUBSTR(CAST(due_date AS TEXT), 9, 2) || ':' || "
        "SUBSTR(CAST(due_date AS TEXT), 11, 2) || ':' || "
        "SUBSTR(CAST(due_date AS TEXT), 13, 2) "
        "WHERE due_date IS NOT NULL AND typeof(due_date) <> 'text'"
    )
    connection.exec_driver_sql(
        "UPDATE tasks SET due_date = due_date || 'T23:59:00' "
        "WHERE due_date IS NOT NULL AND LENGTH(due_date) = 10"
    )
    connection.exec_driver_sql(
        "UPDATE tasks SET due_date = SUBSTR(due_date, 1, 16) || ':00' "
        "WHERE due_date IS NOT NULL AND LENGTH(due_date) <> 16 AND LENGTH(due_date) > 10"
    )


def _normalize_history_due_dates(connection) -> None:
    """Rewrite `task_history.snapshot` due_date values to the same format.

    Snapshots are stored as JSON and written by `crud.build_history_snapshot`,
    so the `"due_date": "..."` fragment can be rewritten textually. Legacy
    date-only values (`"...-DD"`) become `T23:59:00`; second-precision values
    are truncated to the minute. Idempotent.
    """
    tables = {
        row[0]
        for row in connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    if "task_history" not in tables:
        return
    values = connection.exec_driver_sql(
        "SELECT id, snapshot FROM task_history WHERE snapshot LIKE '%\"due_date\"%'"
    ).fetchall()
    for row_id, snapshot in values:
        if not isinstance(snapshot, str):
            continue
        updated = re.sub(
            r'"due_date":\s*"(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?[^"]*"',
            lambda m: f'"due_date": "{m.group(1)}{m.group(2) or "T23:59"}:00"',
            snapshot,
        )
        if updated != snapshot:
            connection.exec_driver_sql(
                "UPDATE task_history SET snapshot = ? WHERE id = ?",
                (updated, row_id),
            )


def _add_group_note(connection) -> None:
    """Add `groups.note` to existing databases. Idempotent (PRAGMA guarded)."""
    group_columns = {
        row[1] for row in connection.exec_driver_sql("PRAGMA table_info(groups)")
    }
    if not group_columns or "note" in group_columns:
        return
    connection.exec_driver_sql("ALTER TABLE groups ADD COLUMN note TEXT")


def _add_task_color(connection) -> None:
    """Add `tasks.color` to existing databases. Idempotent (PRAGMA guarded).

    Nullable: NULL means "follow the priority tint" on the frontend.
    """
    task_columns = {
        row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")
    }
    if not task_columns or "color" in task_columns:
        return
    connection.exec_driver_sql("ALTER TABLE tasks ADD COLUMN color VARCHAR(20)")


def _add_task_group(connection) -> None:
    """Add `tasks.group_id` to existing databases (create_all only adds new tables).

    SQLite supports adding a nullable column with a REFERENCES clause, so no table
    rebuild is needed. Idempotent: guarded by a PRAGMA column check.
    """
    task_columns = {
        row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")
    }
    if not task_columns or "group_id" in task_columns:
        return
    connection.exec_driver_sql(
        "ALTER TABLE tasks ADD COLUMN group_id INTEGER REFERENCES groups (id) ON DELETE SET NULL"
    )
    connection.exec_driver_sql(
        "CREATE INDEX IF NOT EXISTS ix_tasks_group_id ON tasks (group_id)"
    )


def _drop_projects(connection) -> None:
    """Remove the legacy project concept, preserving every task row.

    `create_all` never drops columns or tables, so an existing database still has
    `tasks.project_id` (NOT NULL) and a `projects` table. Rebuild `tasks` without
    that column, copy all rows verbatim, then drop the projects table.
    """
    task_columns = {
        row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")
    }
    if not task_columns:
        return

    has_projects_table = bool(
        connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
        ).fetchall()
    )
    if "project_id" not in task_columns and not has_projects_table:
        return

    connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
    try:
        if "project_id" in task_columns:
            connection.exec_driver_sql(
                """
                CREATE TABLE tasks_migrated (
                    id INTEGER NOT NULL PRIMARY KEY,
                    status_id INTEGER,
                    title VARCHAR(500) NOT NULL,
                    description TEXT,
                    priority INTEGER NOT NULL,
                    due_date DATE,
                    position INTEGER NOT NULL,
                    is_archived BOOLEAN NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    completed_at DATETIME,
                    FOREIGN KEY(status_id) REFERENCES statuses (id) ON DELETE SET NULL
                )
                """
            )
            connection.exec_driver_sql(
                """
                INSERT INTO tasks_migrated (
                    id, status_id, title, description, priority, due_date,
                    position, is_archived, created_at, updated_at, completed_at
                )
                SELECT
                    id, status_id, title, description, priority, due_date,
                    position, is_archived, created_at, updated_at, completed_at
                FROM tasks
                """
            )
            connection.exec_driver_sql("DROP TABLE tasks")
            connection.exec_driver_sql("ALTER TABLE tasks_migrated RENAME TO tasks")
            connection.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_tasks_status_id ON tasks (status_id)"
            )
        connection.exec_driver_sql("DROP TABLE IF EXISTS projects")
    finally:
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
