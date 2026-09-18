from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[schemas.TagOut])
def list_tags(db: Session = Depends(get_db)):
    stmt = select(models.Tag).order_by(models.Tag.name)
    return list(db.scalars(stmt))


@router.post("", response_model=schemas.TagOut, status_code=201)
def create_tag(payload: schemas.TagCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="标签名称不能为空")
    if db.scalar(select(models.Tag).where(models.Tag.name == name)) is not None:
        raise HTTPException(status_code=409, detail="标签名称已存在")
    tag = models.Tag(name=name, color=payload.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=schemas.TagOut)
def update_tag(tag_id: int, payload: schemas.TagUpdate, db: Session = Depends(get_db)):
    tag = db.get(models.Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="标签不存在")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="标签名称不能为空")
        duplicated = db.scalar(
            select(models.Tag).where(models.Tag.name == name, models.Tag.id != tag_id)
        )
        if duplicated is not None:
            raise HTTPException(status_code=409, detail="标签名称已存在")
        data["name"] = name
    for key, value in data.items():
        setattr(tag, key, value)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(models.Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="标签不存在")
    db.delete(tag)
    db.commit()
