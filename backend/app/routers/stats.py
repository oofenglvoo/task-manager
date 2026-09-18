from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=schemas.StatsOut)
def get_stats(project_id: int | None = None, db: Session = Depends(get_db)):
    today = date.today()
    soon = today + timedelta(days=7)

    stmt = select(models.Task).options(selectinload(models.Task.status))
    if project_id is not None:
        stmt = stmt.where(models.Task.project_id == project_id)
    tasks = list(db.scalars(stmt))

    active = [task for task in tasks if not task.is_archived]
    archived = [task for task in tasks if task.is_archived]

    def is_done(task: models.Task) -> bool:
        return task.status is not None and task.status.is_done

    completed = [task for task in active if is_done(task)]
    pending = [task for task in active if not is_done(task)]

    overdue = [
        task for task in pending if task.due_date is not None and task.due_date < today
    ]
    due_soon = [
        task
        for task in pending
        if task.due_date is not None and today <= task.due_date <= soon
    ]

    statuses = list(
        db.scalars(
            select(models.Status).order_by(models.Status.position, models.Status.id)
        )
    )
    by_status = [
        schemas.StatusStat(
            status_id=status.id,
            name=status.name,
            color=status.color,
            is_done=status.is_done,
            count=sum(1 for task in active if task.status_id == status.id),
        )
        for status in statuses
    ]
    unassigned = sum(1 for task in active if task.status_id is None)
    if unassigned:
        by_status.append(
            schemas.StatusStat(
                status_id=None,
                name="未分配",
                color="#94a3b8",
                is_done=False,
                count=unassigned,
            )
        )

    by_priority = [
        schemas.PriorityStat(
            priority=level,
            count=sum(1 for task in active if task.priority == level),
        )
        for level in (1, 2, 3)
    ]

    completion_rate = (
        round(len(completed) / len(active) * 100, 1) if active else 0.0
    )

    return schemas.StatsOut(
        total=len(active) + len(archived),
        active=len(active),
        archived=len(archived),
        completed=len(completed),
        completion_rate=completion_rate,
        overdue=len(overdue),
        due_soon=len(due_soon),
        by_status=by_status,
        by_priority=by_priority,
    )
