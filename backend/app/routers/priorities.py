from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/priorities", tags=["priorities"])


def _task_count(db: Session, priority_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(models.Task)
        .where(models.Task.priority == priority_id)
    ) or 0


@router.get("", response_model=list[schemas.PriorityOut])
def list_priorities(db: Session = Depends(get_db)):
    stmt = select(models.Priority).order_by(models.Priority.position, models.Priority.id)
    priorities = list(db.scalars(stmt))
    return [
        schemas.PriorityOut(
            id=item.id,
            name=item.name,
            color=item.color,
            level=item.level,
            position=item.position,
            task_count=_task_count(db, item.id),
        )
        for item in priorities
    ]


@router.post("", response_model=schemas.PriorityOut, status_code=201)
def create_priority(payload: schemas.PriorityCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="优先级名称不能为空")
    if db.scalar(select(models.Priority).where(models.Priority.name == name)) is not None:
        raise HTTPException(status_code=409, detail="优先级名称已存在")
    max_level = db.scalar(select(func.max(models.Priority.level))) or 0
    priority = models.Priority(
        name=name,
        color=payload.color,
        level=payload.level if payload.level is not None else max_level + 1,
        position=crud.next_position(db, models.Priority),
    )
    db.add(priority)
    db.commit()
    db.refresh(priority)
    return schemas.PriorityOut(
        id=priority.id,
        name=priority.name,
        color=priority.color,
        level=priority.level,
        position=priority.position,
        task_count=0,
    )


@router.put("/reorder", status_code=204)
def reorder_priorities(payload: schemas.ReorderPayload, db: Session = Depends(get_db)):
    crud.reorder_entities(db, models.Priority, payload.ordered_ids)


@router.put("/{priority_id}", response_model=schemas.PriorityOut)
def update_priority(
    priority_id: int, payload: schemas.PriorityUpdate, db: Session = Depends(get_db)
):
    priority = db.get(models.Priority, priority_id)
    if priority is None:
        raise HTTPException(status_code=404, detail="优先级不存在")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="优先级名称不能为空")
        duplicated = db.scalar(
            select(models.Priority).where(
                models.Priority.name == name, models.Priority.id != priority_id
            )
        )
        if duplicated is not None:
            raise HTTPException(status_code=409, detail="优先级名称已存在")
        data["name"] = name
    for key, value in data.items():
        setattr(priority, key, value)
    db.commit()
    db.refresh(priority)
    return schemas.PriorityOut(
        id=priority.id,
        name=priority.name,
        color=priority.color,
        level=priority.level,
        position=priority.position,
        task_count=_task_count(db, priority.id),
    )


@router.delete("/{priority_id}", status_code=204)
def delete_priority(priority_id: int, db: Session = Depends(get_db)):
    priority = db.get(models.Priority, priority_id)
    if priority is None:
        raise HTTPException(status_code=404, detail="优先级不存在")
    total = db.scalar(select(func.count()).select_from(models.Priority)) or 0
    if total <= 1:
        raise HTTPException(status_code=400, detail="至少需要保留一个优先级")
    in_use = _task_count(db, priority_id)
    if in_use:
        raise HTTPException(
            status_code=400,
            detail=f"仍有 {in_use} 个任务使用该优先级，请先调整这些任务",
        )
    db.delete(priority)
    db.commit()
