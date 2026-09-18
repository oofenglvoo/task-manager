from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(archived: bool = False, db: Session = Depends(get_db)):
    stmt = (
        select(models.Project)
        .where(models.Project.is_archived == archived)
        .order_by(models.Project.position, models.Project.id)
    )
    return list(db.scalars(stmt))


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="项目名称不能为空")
    project = models.Project(
        name=name,
        description=payload.description,
        color=payload.color,
        position=crud.next_position(db, models.Project),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/reorder", status_code=204)
def reorder_projects(payload: schemas.ReorderPayload, db: Session = Depends(get_db)):
    crud.reorder_entities(db, models.Project, payload.ordered_ids)


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    return crud.get_project(db, project_id)


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)
):
    project = crud.get_project(db, project_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="项目名称不能为空")
        data["name"] = name
    for key, value in data.items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/archive", response_model=schemas.ProjectOut)
def archive_project(
    project_id: int, payload: schemas.ArchivePayload, db: Session = Depends(get_db)
):
    project = crud.get_project(db, project_id)
    project.is_archived = payload.is_archived
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    db.delete(project)
    db.commit()
