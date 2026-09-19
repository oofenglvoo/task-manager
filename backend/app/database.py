import os
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
        _add_group_note(connection)
        _normalize_due_dates(connection)


def _normalize_due_dates(connection) -> None:
    """Rewrite legacy date-only `tasks.due_date` values to end-of-day 23:59.

    `due_date` became a datetime; old rows hold plain `YYYY-MM-DD`. Treating them
    as 23:59 keeps them from all flipping to "overdue" at 00:00. Idempotent: rows
    that already carry a time (length > 10) are left untouched.
    """
    task_columns = {
        row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")
    }
    if not task_columns or "due_date" not in task_columns:
        return
    connection.exec_driver_sql(
        "UPDATE tasks SET due_date = due_date || 'T23:59:00' "
        "WHERE due_date IS NOT NULL AND LENGTH(due_date) = 10"
    )


def _add_group_note(connection) -> None:
    """Add `groups.note` to existing databases. Idempotent (PRAGMA guarded)."""
    group_columns = {
        row[1] for row in connection.exec_driver_sql("PRAGMA table_info(groups)")
    }
    if not group_columns or "note" in group_columns:
        return
    connection.exec_driver_sql("ALTER TABLE groups ADD COLUMN note TEXT")


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
