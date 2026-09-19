import json
import re

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models
from .models import utcnow

_IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)


def _strip_images(html: str | None) -> str | None:
    if not html:
        return html
    return _IMG_TAG.sub("", html).strip() or None


def build_history_snapshot(task: models.Task) -> dict:
    """任务主字段的自包含快照（存名称而非外键，描述去除图片）。"""
    return {
        "title": task.title,
        "status_name": task.status.name if task.status is not None else None,
        "group_name": task.group.name if task.group is not None else None,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date is not None else None,
        "tag_names": [tag.name for tag in task.tags],
        "description": _strip_images(task.description),
    }


def record_history(db: Session, task: models.Task) -> models.TaskHistory:
    entry = models.TaskHistory(
        task_id=task.id,
        snapshot=json.dumps(build_history_snapshot(task), ensure_ascii=False),
    )
    db.add(entry)
    return entry


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


def resolve_group(db: Session, group_id: int | None) -> models.Group | None:
    if group_id is None:
        return None
    group = db.get(models.Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="分组不存在")
    return group


def resolve_priority(db: Session, priority: int | None) -> int:
    """Return a valid priority id; default to the first one when unspecified."""
    if priority is None:
        first = db.scalar(
            select(models.Priority).order_by(models.Priority.position, models.Priority.id)
        )
        return first.id if first is not None else 1
    if db.get(models.Priority, priority) is None:
        raise HTTPException(status_code=404, detail="优先级不存在")
    return priority


def create_task(db: Session, payload) -> models.Task:
    status = resolve_status(db, payload.status_id)
    resolve_group(db, payload.group_id)
    priority = resolve_priority(db, payload.priority)
    task = models.Task(
        status_id=status.id if status is not None else None,
        group_id=payload.group_id,
        title=_clean_title(payload.title),
        description=payload.description,
        priority=priority,
        due_date=payload.due_date,
        position=next_task_position(db),
    )
    if status is not None and status.is_done:
        task.completed_at = utcnow()
    task.tags = load_tags(db, payload.tag_ids)
    db.add(task)
    db.flush()
    record_history(db, task)  # 新建即写入初始快照 (v1)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: models.Task, payload) -> models.Task:
    data = payload.model_dump(exclude_unset=True)
    tag_ids = data.pop("tag_ids", None)
    status_provided = "status_id" in data
    new_status_id = data.pop("status_id", None)
    group_provided = "group_id" in data
    new_group_id = data.pop("group_id", None)

    before = build_history_snapshot(task)

    if "title" in data and data["title"] is not None:
        data["title"] = _clean_title(data["title"])

    if "priority" in data and data["priority"] is not None:
        data["priority"] = resolve_priority(db, data["priority"])

    for key, value in data.items():
        setattr(task, key, value)

    if group_provided:
        resolve_group(db, new_group_id)
        task.group_id = new_group_id

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

    if build_history_snapshot(task) != before:
        record_history(db, task)

    db.commit()
    db.refresh(task)
    return task


def move_task(db: Session, task: models.Task, payload) -> models.Task:
    data = payload.model_dump(exclude_unset=True)

    if data.get("status_id") is not None:
        status = db.get(models.Status, data["status_id"])
        if status is None:
            raise HTTPException(status_code=404, detail="状态不存在")
        task.status_id = status.id
        if status.is_done:
            if task.completed_at is None:
                task.completed_at = utcnow()
        else:
            task.completed_at = None

    if "group_id" in data:
        resolve_group(db, data["group_id"])
        task.group_id = data["group_id"]

    if data.get("position") is not None:
        task.position = data["position"]

    db.commit()
    db.refresh(task)
    return task


def reorder_tasks(db: Session, ordered_ids: list[int]) -> None:
    for index, task_id in enumerate(ordered_ids, start=1):
        task = db.get(models.Task, task_id)
        if task is not None:
            task.position = index
    db.commit()
