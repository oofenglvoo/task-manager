from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _task_count(db: Session, group_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(models.Task)
        .where(models.Task.group_id == group_id)
    ) or 0


@router.get("", response_model=list[schemas.GroupOut])
def list_groups(db: Session = Depends(get_db)):
    stmt = select(models.Group).order_by(models.Group.position, models.Group.id)
    groups = list(db.scalars(stmt))
    return [
        schemas.GroupOut(
            id=group.id,
            name=group.name,
            color=group.color,
            position=group.position,
            task_count=_task_count(db, group.id),
        )
        for group in groups
    ]


@router.post("", response_model=schemas.GroupOut, status_code=201)
def create_group(payload: schemas.GroupCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="分组名称不能为空")
    if db.scalar(select(models.Group).where(models.Group.name == name)) is not None:
        raise HTTPException(status_code=409, detail="分组名称已存在")
    group = models.Group(
        name=name,
        color=payload.color,
        position=crud.next_position(db, models.Group),
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return schemas.GroupOut(
        id=group.id,
        name=group.name,
        color=group.color,
        position=group.position,
        task_count=0,
    )


@router.put("/reorder", status_code=204)
def reorder_groups(payload: schemas.ReorderPayload, db: Session = Depends(get_db)):
    crud.reorder_entities(db, models.Group, payload.ordered_ids)


@router.put("/{group_id}", response_model=schemas.GroupOut)
def update_group(
    group_id: int, payload: schemas.GroupUpdate, db: Session = Depends(get_db)
):
    group = db.get(models.Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="分组不存在")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="分组名称不能为空")
        duplicated = db.scalar(
            select(models.Group).where(
                models.Group.name == name, models.Group.id != group_id
            )
        )
        if duplicated is not None:
            raise HTTPException(status_code=409, detail="分组名称已存在")
        data["name"] = name
    for key, value in data.items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return schemas.GroupOut(
        id=group.id,
        name=group.name,
        color=group.color,
        position=group.position,
        task_count=_task_count(db, group.id),
    )


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = db.get(models.Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="分组不存在")
    db.delete(group)
    db.commit()
