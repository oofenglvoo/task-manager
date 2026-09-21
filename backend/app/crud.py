import json
import re
from datetime import date, datetime

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


def as_datetime(value: object) -> datetime | None:
    """把 ``due_date`` 归一化为 naive datetime（分钟精度）。

    兼容四种历史形态：
    - ``datetime``（正常路径）；
    - 纯日期 ``date``（按 23:59 处理）；
    - ISO 字符串（含历史快照；纯日期同样按 23:59）；
    - 数字亲和性遗留值（``20260920235900`` 这类 int/float）。

    归一化是必需的：否则 ``.isoformat()`` 会直接 500。
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value.replace(tzinfo=None) if value.tzinfo else value
    elif isinstance(value, date):
        parsed = datetime(value.year, value.month, value.day, 23, 59)
    elif isinstance(value, bool):
        return None
    elif isinstance(value, (int, float)):
        parsed = _from_numeric(value)
        if parsed is None:
            return None
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            if text.isdigit() and len(text) >= 14:
                parsed = _from_numeric(int(text[:14]))
                if parsed is None:
                    return None
            else:
                return None
        if parsed.tzinfo is not None:
            parsed = parsed.replace(tzinfo=None)
        if len(text) <= 10:
            parsed = parsed.replace(hour=23, minute=59)
    else:
        return None
    return parsed.replace(second=0, microsecond=0)


def _from_numeric(value: int | float) -> datetime | None:
    """还原 ``YYYYMMDDHHMMSS`` 形态的数字时间戳（SQLite 数字亲和性遗留）。"""
    text = str(int(value))
    if len(text) < 8:
        return None
    try:
        return datetime(
            int(text[0:4]),
            int(text[4:6]),
            int(text[6:8]),
            int(text[8:10]) if len(text) >= 10 else 0,
            int(text[10:12]) if len(text) >= 12 else 0,
            int(text[12:14]) if len(text) >= 14 else 0,
        )
    except ValueError:
        return None


def build_history_snapshot(task: models.Task) -> dict:
    """任务主字段的自包含快照（存名称而非外键，描述去除图片）。"""
    due = as_datetime(task.due_date)
    return {
        "title": task.title,
        "status_name": task.status.name if task.status is not None else None,
        "group_name": task.group.name if task.group is not None else None,
        "priority": task.priority,
        "due_date": due.isoformat() if due is not None else None,
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
        color=payload.color,
        due_date=as_datetime(payload.due_date),
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

    if "due_date" in data:
        data["due_date"] = as_datetime(data["due_date"])

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
