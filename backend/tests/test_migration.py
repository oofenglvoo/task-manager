import json
import sqlite3
from pathlib import Path

from sqlalchemy import create_engine


LEGACY_TASKS_DDL = """
CREATE TABLE projects (
    id INTEGER NOT NULL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(20) NOT NULL,
    position INTEGER NOT NULL,
    is_archived BOOLEAN NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
)
"""

LEGACY_TASK_DDL = """
CREATE TABLE tasks (
    id INTEGER NOT NULL PRIMARY KEY,
    project_id INTEGER NOT NULL,
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
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY(status_id) REFERENCES statuses (id) ON DELETE SET NULL
)
"""


def _build_legacy_db(path: Path) -> None:
    connection = sqlite3.connect(path)
    connection.executescript(
        """
        CREATE TABLE statuses (
            id INTEGER NOT NULL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(20) NOT NULL,
            is_done BOOLEAN NOT NULL,
            position INTEGER NOT NULL,
            created_at DATETIME NOT NULL
        );
        """
    )
    connection.executescript(LEGACY_TASKS_DDL)
    connection.executescript(LEGACY_TASK_DDL)
    connection.execute(
        "INSERT INTO statuses VALUES (1, '待办', '#94a3b8', 0, 1, '2026-01-01 00:00:00')"
    )
    connection.execute(
        "INSERT INTO projects VALUES (1, '默认项目', NULL, '#6366f1', 1, 0,"
        " '2026-01-01 00:00:00', '2026-01-01 00:00:00')"
    )
    connection.execute(
        "INSERT INTO tasks VALUES (1, 1, 1, '旧任务A', NULL, 2, NULL, 1, 0,"
        " '2026-01-02 03:04:05', '2026-01-03 04:05:06', NULL)"
    )
    connection.execute(
        "INSERT INTO tasks VALUES (2, 1, NULL, '旧任务B', '说明', 3, '2026-02-01', 2, 1,"
        " '2026-01-04 05:06:07', '2026-01-05 06:07:08', '2026-01-06 07:08:09')"
    )
    connection.commit()
    connection.close()


def test_ensure_schema_drops_projects_and_keeps_tasks(tmp_path):
    from app import database

    db_path = tmp_path / "legacy.db"
    _build_legacy_db(db_path)

    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        database._drop_projects(connection)

    with sqlite3.connect(db_path) as connection:
        task_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(tasks)")
        }
        assert "project_id" not in task_columns
        assert "created_at" in task_columns and "updated_at" in task_columns
        assert "completed_at" in task_columns

        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        assert "projects" not in tables

        rows = list(
            connection.execute(
                "SELECT id, title, status_id, is_archived, created_at, updated_at,"
                " completed_at FROM tasks ORDER BY id"
            )
        )
        assert rows[0] == (
            1,
            "旧任务A",
            1,
            0,
            "2026-01-02 03:04:05",
            "2026-01-03 04:05:06",
            None,
        )
        assert rows[1] == (
            2,
            "旧任务B",
            None,
            1,
            "2026-01-04 05:06:07",
            "2026-01-05 06:07:08",
            "2026-01-06 07:08:09",
        )


def test_drop_projects_is_idempotent(tmp_path):
    from app import database

    db_path = tmp_path / "legacy.db"
    _build_legacy_db(db_path)

    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        database._drop_projects(connection)
    with engine.begin() as connection:
        database._drop_projects(connection)

    with sqlite3.connect(db_path) as connection:
        assert connection.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 2


def test_add_task_group_is_idempotent(tmp_path):
    from app import database

    db_path = tmp_path / "legacy.db"
    _build_legacy_db(db_path)

    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE groups (id INTEGER NOT NULL PRIMARY KEY, name VARCHAR(100) NOT NULL)"
        )
        database._add_task_group(connection)
    with engine.begin() as connection:
        database._add_task_group(connection)

    with sqlite3.connect(db_path) as connection:
        columns = [row[1] for row in connection.execute("PRAGMA table_info(tasks)")]
        assert columns.count("group_id") == 1
        assert connection.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 2
        indexes = [row[1] for row in connection.execute("PRAGMA index_list(tasks)")]
        assert "ix_tasks_group_id" in indexes


def test_add_task_group_noop_when_existing(tmp_path):
    from app import database

    db_path = tmp_path / "modern.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE tasks (id INTEGER NOT NULL PRIMARY KEY, group_id INTEGER)"
        )
        database._add_task_group(connection)
        columns = [row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")]
        assert columns == ["id", "group_id"]


def test_add_group_note_is_idempotent(tmp_path):
    from app import database

    db_path = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE groups (id INTEGER NOT NULL PRIMARY KEY, name VARCHAR(100) NOT NULL)"
        )
        database._add_group_note(connection)
    with engine.begin() as connection:
        database._add_group_note(connection)

    with sqlite3.connect(db_path) as connection:
        columns = [row[1] for row in connection.execute("PRAGMA table_info(groups)")]
        assert columns.count("note") == 1


def test_add_task_color_is_idempotent(tmp_path):
    from app import database

    db_path = tmp_path / "legacy.db"
    _build_legacy_db(db_path)

    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        database._add_task_color(connection)
    with engine.begin() as connection:
        database._add_task_color(connection)

    with sqlite3.connect(db_path) as connection:
        columns = [row[1] for row in connection.execute("PRAGMA table_info(tasks)")]
        assert columns.count("color") == 1
        assert connection.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 2
        assert connection.execute(
            "SELECT COUNT(*) FROM tasks WHERE color IS NULL"
        ).fetchone()[0] == 2


def test_add_task_color_noop_when_existing(tmp_path):
    from app import database

    db_path = tmp_path / "modern.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE tasks (id INTEGER NOT NULL PRIMARY KEY, color VARCHAR(20))"
        )
        database._add_task_color(connection)
        columns = [
            row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")
        ]
        assert columns == ["id", "color"]


def test_normalize_due_dates_handles_all_legacy_forms(tmp_path):
    """三种旧形态都要变成 ISO 文本，否则读路径会 TypeError / 显示错日期。"""
    from app import database

    db_path = tmp_path / "duedates.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE tasks (id INTEGER NOT NULL PRIMARY KEY, due_date DATE)"
        )
        connection.exec_driver_sql(
            "INSERT INTO tasks (id, due_date) VALUES "
            "(1, '2026-02-01'), "
            "(2, '2026-02-01T18:30:45'), "
            "(3, 20260920235900)"
        )
        database._normalize_due_dates(connection)

    with sqlite3.connect(db_path) as connection:
        rows = list(
            connection.execute("SELECT id, typeof(due_date), due_date FROM tasks ORDER BY id")
        )
        assert rows == [
            (1, "text", "2026-02-01T23:59:00"),
            (2, "text", "2026-02-01T18:30:00"),
            (3, "text", "2026-09-20T23:59:00"),
        ]


def test_normalize_due_dates_is_idempotent(tmp_path):
    from app import database

    db_path = tmp_path / "duedates_idem.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE tasks (id INTEGER NOT NULL PRIMARY KEY, due_date DATE)"
        )
        connection.exec_driver_sql(
            "INSERT INTO tasks (id, due_date) VALUES (1, '2026-02-01'), (2, 20260920235900)"
        )
        database._normalize_due_dates(connection)
    with engine.begin() as connection:
        database._normalize_due_dates(connection)

    with sqlite3.connect(db_path) as connection:
        rows = list(connection.execute("SELECT id, due_date FROM tasks ORDER BY id"))
        assert rows == [(1, "2026-02-01T23:59:00"), (2, "2026-09-20T23:59:00")]


def test_normalize_due_dates_noop_without_column(tmp_path):
    from app import database

    db_path = tmp_path / "nodue.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE tasks (id INTEGER NOT NULL PRIMARY KEY)"
        )
        database._normalize_due_dates(connection)
        columns = [
            row[1] for row in connection.exec_driver_sql("PRAGMA table_info(tasks)")
        ]
        assert columns == ["id"]


def test_normalize_history_due_dates_rewrites_date_only(tmp_path):
    from app import database

    db_path = tmp_path / "history.db"
    engine = create_engine(f"sqlite:///{db_path.as_posix()}", future=True)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE task_history (id INTEGER NOT NULL PRIMARY KEY, snapshot TEXT NOT NULL)"
        )
        connection.exec_driver_sql(
            "INSERT INTO task_history (id, snapshot) VALUES "
            "(1, '{\"title\": \"A\", \"due_date\": \"2026-09-20\"}'), "
            "(2, '{\"title\": \"B\", \"due_date\": \"2026-09-20T18:30:45\"}'), "
            "(3, '{\"title\": \"C\", \"due_date\": null}')"
        )
        database._normalize_history_due_dates(connection)
    with engine.begin() as connection:
        database._normalize_history_due_dates(connection)

    with sqlite3.connect(db_path) as connection:
        snapshots = [
            row[0]
            for row in connection.execute("SELECT snapshot FROM task_history ORDER BY id")
        ]
    assert json.loads(snapshots[0])["due_date"] == "2026-09-20T23:59:00"
    assert json.loads(snapshots[1])["due_date"] == "2026-09-20T18:30:00"
    assert json.loads(snapshots[2])["due_date"] is None

