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
    """Apply additive migrations that create_all cannot handle (new columns)."""
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(preferences)")
        }
        if columns and "compact" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE preferences ADD COLUMN compact BOOLEAN NOT NULL DEFAULT 0"
            )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
