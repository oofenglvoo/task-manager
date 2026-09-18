from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models

DEFAULT_STATUSES = [
    ("待办", "#94a3b8", False),
    ("进行中", "#3b82f6", False),
    ("已完成", "#22c55e", True),
]


def seed_defaults(db: Session) -> None:
    if db.scalar(select(models.Status.id).limit(1)) is None:
        for index, (name, color, is_done) in enumerate(DEFAULT_STATUSES, start=1):
            db.add(
                models.Status(name=name, color=color, is_done=is_done, position=index)
            )
    db.commit()
