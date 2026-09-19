from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models

DEFAULT_STATUSES = [
    ("待办", "#94a3b8", False),
    ("进行中", "#3b82f6", False),
    ("已完成", "#22c55e", True),
]

# id 由自增分配，默认三条的 level/顺序与旧版 Task.priority 的 1/2/3 一一对应。
DEFAULT_PRIORITIES = [
    ("低", "#6b7280", 1),
    ("中", "#f59e0b", 2),
    ("高", "#ef4444", 3),
]


def seed_defaults(db: Session) -> None:
    if db.scalar(select(models.Status.id).limit(1)) is None:
        for index, (name, color, is_done) in enumerate(DEFAULT_STATUSES, start=1):
            db.add(
                models.Status(name=name, color=color, is_done=is_done, position=index)
            )
    if db.scalar(select(models.Priority.id).limit(1)) is None:
        for index, (name, color, level) in enumerate(DEFAULT_PRIORITIES, start=1):
            db.add(
                models.Priority(name=name, color=color, level=level, position=index)
            )
    db.commit()
