from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models
from .models import utcnow


def next_position(db: Session, model) -> int:
    max_pos = db.scalar(select(func.max(model.position)))
    return (max_pos or 0) + 1


def next_task_position(db: Session) -> int:
    max_pos = db.scalar(select(func.max(models.Task.position)))
    return (max_pos or 0) + 1


def reorder_entities(db: Session, model, ordered_ids: list[int]) -> None:
    for index, entity_id in enumerate(ordered_ids, start=1):
        entity = db.get(model, entity_id)
        if entity is not None:
            entity.position = index
    db.commit()


def _clean_title(title: str) -> str:
    cleaned = title.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="标题不能为空")
    return cleaned


def resolve_status(db: Session, status_id: int | None) -> models.Status | None:
    if status_id is None:
        return db.scalar(select(models.Status).order_by(models.Status.position, models.Status.id))
    status = db.get(models.Status, status_id)
    if status is None:
        raise HTTPException(status_code=404, detail="状态不存在")
    return status


def load_tags(db: Session, tag_ids: list[int]) -> list[models.Tag]:
    if not tag_ids:
        return []
    unique_ids = list(dict.fromkeys(tag_ids))
    tags = list(db.scalars(select(models.Tag).where(models.Tag.id.in_(unique_ids))))
    if len(tags) != len(unique_ids):
        raise HTTPException(status_code=400, detail="包含不存在的标签")
    return tags


def create_task(db: Session, payload) -> models.Task:
    status = resolve_status(db, payload.status_id)
    task = models.Task(
        status_id=status.id if status is not None else None,
        title=_clean_title(payload.title),
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        position=next_task_position(db),
    )
    if status is not None and status.is_done:
        task.completed_at = utcnow()
    task.tags = load_tags(db, payload.tag_ids)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: models.Task, payload) -> models.Task:
    data = payload.model_dump(exclude_unset=True)
    tag_ids = data.pop("tag_ids", None)
    status_provided = "status_id" in data
    new_status_id = data.pop("status_id", None)

    if "title" in data and data["title"] is not None:
        data["title"] = _clean_title(data["title"])

    for key, value in data.items():
        setattr(task, key, value)

    if status_provided:
        status = resolve_status(db, new_status_id)
        task.status_id = status.id if status is not None else None
        if status is not None and status.is_done:
            if task.completed_at is None:
                task.completed_at = utcnow()
        else:
            task.completed_at = None

    if tag_ids is not None:
        task.tags = load_tags(db, tag_ids)

    db.commit()
    db.refresh(task)
    return task


def move_task(db: Session, task: models.Task, payload) -> models.Task:
    if payload.status_id is not None:
        status = db.get(models.Status, payload.status_id)
        if status is None:
            raise HTTPException(status_code=404, detail="状态不存在")
        task.status_id = status.id
        if status.is_done:
            if task.completed_at is None:
                task.completed_at = utcnow()
        else:
            task.completed_at = None

    if payload.position is not None:
        task.position = payload.position

    db.commit()
    db.refresh(task)
    return task


def reorder_tasks(db: Session, ordered_ids: list[int]) -> None:
    for index, task_id in enumerate(ordered_ids, start=1):
        task = db.get(models.Task, task_id)
        if task is not None:
            task.position = index
    db.commit()
