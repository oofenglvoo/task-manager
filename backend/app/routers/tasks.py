from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

SORT_COLUMNS = {
    "position": models.Task.position,
    "priority": models.Task.priority,
    "due_date": models.Task.due_date,
    "created_at": models.Task.created_at,
    "updated_at": models.Task.updated_at,
    "title": models.Task.title,
}

LOAD_OPTIONS = (
    selectinload(models.Task.tags),
    selectinload(models.Task.group),
    selectinload(models.Task.subtasks),
)


def _get_task(db: Session, task_id: int) -> models.Task:
    task = db.get(models.Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(
    status_id: int | None = None,
    group_id: int | None = None,
    ungrouped: bool = False,
    priority: int | None = None,
    tag_id: int | None = None,
    q: str | None = None,
    archived: bool = False,
    sort: str = "position",
    order: str = "asc",
    db: Session = Depends(get_db),
):
    if sort not in SORT_COLUMNS:
        raise HTTPException(status_code=400, detail=f"不支持的排序字段: {sort}")
    if order not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail="排序方向只能是 asc 或 desc")

    stmt = select(models.Task).where(models.Task.is_archived == archived)
    if status_id is not None:
        stmt = stmt.where(models.Task.status_id == status_id)
    if group_id is not None:
        stmt = stmt.where(models.Task.group_id == group_id)
    elif ungrouped:
        stmt = stmt.where(models.Task.group_id.is_(None))
    if priority is not None:
        stmt = stmt.where(models.Task.priority == priority)
    if tag_id is not None:
        stmt = stmt.where(models.Task.tags.any(models.Tag.id == tag_id))
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                models.Task.title.ilike(pattern),
                models.Task.description.ilike(pattern),
            )
        )

    column = SORT_COLUMNS[sort]
    stmt = stmt.order_by(
        column.desc() if order == "desc" else column.asc(),
        models.Task.id.asc(),
    )
    return list(db.scalars(stmt.options(*LOAD_OPTIONS)))


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, payload)


@router.put("/reorder", status_code=204)
def reorder_tasks(payload: schemas.ReorderPayload, db: Session = Depends(get_db)):
    crud.reorder_tasks(db, payload.ordered_ids)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    return _get_task(db, task_id)


@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)
):
    task = _get_task(db, task_id)
    return crud.update_task(db, task, payload)


@router.put("/{task_id}/move", response_model=schemas.TaskOut)
def move_task(task_id: int, payload: schemas.TaskMove, db: Session = Depends(get_db)):
    task = _get_task(db, task_id)
    return crud.move_task(db, task, payload)


@router.post("/{task_id}/archive", response_model=schemas.TaskOut)
def archive_task(
    task_id: int, payload: schemas.ArchivePayload, db: Session = Depends(get_db)
):
    task = _get_task(db, task_id)
    task.is_archived = payload.is_archived
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task(db, task_id)
    db.delete(task)
    db.commit()


@router.get("/{task_id}/history", response_model=list[schemas.TaskHistoryOut])
def list_history(task_id: int, db: Session = Depends(get_db)):
    _get_task(db, task_id)
    stmt = (
        select(models.TaskHistory)
        .where(models.TaskHistory.task_id == task_id)
        .order_by(models.TaskHistory.created_at.desc(), models.TaskHistory.id.desc())
    )
    return list(db.scalars(stmt))


@router.delete("/{task_id}/history/{history_id}", status_code=204)
def delete_history(task_id: int, history_id: int, db: Session = Depends(get_db)):
    entry = db.get(models.TaskHistory, history_id)
    if entry is None or entry.task_id != task_id:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    db.delete(entry)
    db.commit()
