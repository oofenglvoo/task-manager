import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..models import utcnow
from ..seed import DEFAULT_PRIORITIES

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/export", response_model=schemas.ExportData)
def export_data(db: Session = Depends(get_db)):
    statuses = list(
        db.scalars(
            select(models.Status).order_by(models.Status.position, models.Status.id)
        )
    )
    tags = list(db.scalars(select(models.Tag).order_by(models.Tag.name)))
    groups = list(
        db.scalars(
            select(models.Group).order_by(models.Group.position, models.Group.id)
        )
    )
    priorities = list(
        db.scalars(
            select(models.Priority).order_by(models.Priority.position, models.Priority.id)
        )
    )
    tasks = list(
        db.scalars(
            select(models.Task)
            .options(
                selectinload(models.Task.tags),
                selectinload(models.Task.subtasks),
                selectinload(models.Task.history),
            )
            .order_by(models.Task.position, models.Task.id)
        )
    )

    return schemas.ExportData(
        version=1,
        exported_at=utcnow(),
        statuses=[
            schemas.ExportStatus(
                id=status.id,
                name=status.name,
                color=status.color,
                is_done=status.is_done,
                position=status.position,
            )
            for status in statuses
        ],
        tags=[
            schemas.ExportTag(id=tag.id, name=tag.name, color=tag.color)
            for tag in tags
        ],
        groups=[
            schemas.ExportGroup(
                id=group.id,
                name=group.name,
                color=group.color,
                note=group.note,
                position=group.position,
            )
            for group in groups
        ],
        priorities=[
            schemas.ExportPriority(
                id=priority.id,
                name=priority.name,
                color=priority.color,
                level=priority.level,
                position=priority.position,
            )
            for priority in priorities
        ],
        tasks=[
            schemas.ExportTask(
                id=task.id,
                status_id=task.status_id,
                group_id=task.group_id,
                title=task.title,
                description=task.description,
                priority=task.priority,
                due_date=task.due_date,
                position=task.position,
                is_archived=task.is_archived,
                created_at=task.created_at,
                updated_at=task.updated_at,
                completed_at=task.completed_at,
                tag_ids=[tag.id for tag in task.tags],
                subtasks=[
                    schemas.ExportSubTask(
                        title=subtask.title,
                        is_done=subtask.is_done,
                        position=subtask.position,
                    )
                    for subtask in task.subtasks
                ],
                history=[
                    schemas.ExportHistory(
                        created_at=entry.created_at,
                        snapshot=schemas.TaskHistorySnapshot(**json.loads(entry.snapshot)),
                    )
                    for entry in task.history
                ],
            )
            for task in tasks
        ],
    )


@router.post("/import", response_model=schemas.ImportResult)
def import_data(payload: schemas.ExportData, db: Session = Depends(get_db)):
    tag_ids = {tag.id for tag in payload.tags}
    group_ids = {group.id for group in payload.groups}
    priority_ids = {priority.id for priority in payload.priorities}

    for task in payload.tasks:
        for tag_id in task.tag_ids:
            if tag_id not in tag_ids:
                raise HTTPException(
                    status_code=400, detail=f"任务「{task.title}」引用了不存在的标签"
                )
        if task.group_id is not None and task.group_id not in group_ids:
            raise HTTPException(
                status_code=400, detail=f"任务「{task.title}」引用了不存在的分组"
            )
        # 旧备份可能没有 priorities，此时任务的 priority 值需要落在默认三条里。
        if priority_ids and task.priority not in priority_ids:
            raise HTTPException(
                status_code=400, detail=f"任务「{task.title}」引用了不存在的优先级"
            )

    status_names = [status.name for status in payload.statuses]
    if len(status_names) != len(set(status_names)):
        raise HTTPException(status_code=400, detail="导入数据中状态名称重复")
    tag_names = [tag.name for tag in payload.tags]
    if len(tag_names) != len(set(tag_names)):
        raise HTTPException(status_code=400, detail="导入数据中标签名称重复")
    group_names = [group.name for group in payload.groups]
    if len(group_names) != len(set(group_names)):
        raise HTTPException(status_code=400, detail="导入数据中分组名称重复")
    priority_names = [priority.name for priority in payload.priorities]
    if len(priority_names) != len(set(priority_names)):
        raise HTTPException(status_code=400, detail="导入数据中优先级名称重复")

    db.execute(delete(models.TaskHistory))
    db.execute(delete(models.SubTask))
    db.execute(delete(models.task_tags))
    db.execute(delete(models.Task))
    db.execute(delete(models.Tag))
    db.execute(delete(models.Group))
    db.execute(delete(models.Priority))
    db.execute(delete(models.Status))
    db.flush()

    status_map: dict[int, int] = {}
    for item in payload.statuses:
        status = models.Status(
            name=item.name,
            color=item.color,
            is_done=item.is_done,
            position=item.position,
        )
        db.add(status)
        db.flush()
        status_map[item.id] = status.id

    tag_map: dict[int, int] = {}
    for item in payload.tags:
        tag = models.Tag(name=item.name, color=item.color)
        db.add(tag)
        db.flush()
        tag_map[item.id] = tag.id

    group_map: dict[int, int] = {}
    for item in payload.groups:
        group = models.Group(
            name=item.name,
            color=item.color,
            note=item.note,
            position=item.position,
        )
        db.add(group)
        db.flush()
        group_map[item.id] = group.id

    priority_map: dict[int, int] = {}
    if payload.priorities:
        for item in payload.priorities:
            priority = models.Priority(
                name=item.name,
                color=item.color,
                level=item.level,
                position=item.position,
            )
            db.add(priority)
            db.flush()
            priority_map[item.id] = priority.id
    else:
        # 旧备份没有优先级数据：重建默认三条，并将任务 priority 直接沿用。
        for index, (name, color, level) in enumerate(DEFAULT_PRIORITIES, start=1):
            priority = models.Priority(
                name=name, color=color, level=level, position=index
            )
            db.add(priority)
            db.flush()
            priority_map[index] = priority.id

    fallback_priority = next(iter(priority_map.values()))

    task_count = 0
    subtask_count = 0
    for item in payload.tasks:
        task = models.Task(
            status_id=status_map.get(item.status_id)
            if item.status_id is not None
            else None,
            group_id=group_map.get(item.group_id)
            if item.group_id is not None
            else None,
            title=item.title,
            description=item.description,
            priority=priority_map.get(item.priority, fallback_priority),
            due_date=item.due_date,
            position=item.position,
            is_archived=item.is_archived,
            completed_at=item.completed_at,
        )
        if item.created_at is not None:
            task.created_at = item.created_at
        if item.updated_at is not None:
            task.updated_at = item.updated_at
        task.tags = [
            db.get(models.Tag, tag_map[tag_id])
            for tag_id in item.tag_ids
            if tag_id in tag_map
        ]
        for subtask in item.subtasks:
            task.subtasks.append(
                models.SubTask(
                    title=subtask.title,
                    is_done=subtask.is_done,
                    position=subtask.position,
                )
            )
        for entry in item.history:
            history = models.TaskHistory(
                snapshot=entry.snapshot.model_dump_json(),
            )
            if entry.created_at is not None:
                history.created_at = entry.created_at
            task.history.append(history)
        db.add(task)
        task_count += 1
        subtask_count += len(item.subtasks)

    db.commit()
    return schemas.ImportResult(
        statuses=len(payload.statuses),
        tags=len(payload.tags),
        groups=len(payload.groups),
        priorities=len(priority_map),
        tasks=task_count,
        subtasks=subtask_count,
    )
