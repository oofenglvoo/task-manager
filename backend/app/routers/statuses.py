from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/statuses", tags=["statuses"])


@router.get("", response_model=list[schemas.StatusOut])
def list_statuses(db: Session = Depends(get_db)):
    stmt = select(models.Status).order_by(models.Status.position, models.Status.id)
    return list(db.scalars(stmt))


@router.post("", response_model=schemas.StatusOut, status_code=201)
def create_status(payload: schemas.StatusCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="状态名称不能为空")
    if db.scalar(select(models.Status).where(models.Status.name == name)) is not None:
        raise HTTPException(status_code=409, detail="状态名称已存在")
    status = models.Status(
        name=name,
        color=payload.color,
        is_done=payload.is_done,
        position=crud.next_position(db, models.Status),
    )
    db.add(status)
    db.commit()
    db.refresh(status)
    return status


@router.put("/reorder", status_code=204)
def reorder_statuses(payload: schemas.ReorderPayload, db: Session = Depends(get_db)):
    crud.reorder_entities(db, models.Status, payload.ordered_ids)


@router.put("/{status_id}", response_model=schemas.StatusOut)
def update_status(
    status_id: int, payload: schemas.StatusUpdate, db: Session = Depends(get_db)
):
    status = db.get(models.Status, status_id)
    if status is None:
        raise HTTPException(status_code=404, detail="状态不存在")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="状态名称不能为空")
        duplicated = db.scalar(
            select(models.Status).where(
                models.Status.name == name, models.Status.id != status_id
            )
        )
        if duplicated is not None:
            raise HTTPException(status_code=409, detail="状态名称已存在")
        data["name"] = name
    for key, value in data.items():
        setattr(status, key, value)
    db.commit()
    db.refresh(status)
    return status


@router.delete("/{status_id}", status_code=204)
def delete_status(status_id: int, db: Session = Depends(get_db)):
    status = db.get(models.Status, status_id)
    if status is None:
        raise HTTPException(status_code=404, detail="状态不存在")
    in_use = db.scalar(
        select(func.count())
        .select_from(models.Task)
        .where(models.Task.status_id == status_id)
    )
    if in_use:
        raise HTTPException(
            status_code=400,
            detail=f"仍有 {in_use} 个任务使用该状态，请先移动这些任务",
        )
    db.delete(status)
    db.commit()
