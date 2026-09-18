from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["subtasks"])


def _get_task(db: Session, task_id: int) -> models.Task:
    task = db.get(models.Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


def _get_subtask(db: Session, task_id: int, subtask_id: int) -> models.SubTask:
    subtask = db.get(models.SubTask, subtask_id)
    if subtask is None or subtask.task_id != task_id:
        raise HTTPException(status_code=404, detail="子任务不存在")
    return subtask


@router.get("/{task_id}/subtasks", response_model=list[schemas.SubTaskOut])
def list_subtasks(task_id: int, db: Session = Depends(get_db)):
    task = _get_task(db, task_id)
    return task.subtasks


@router.post("/{task_id}/subtasks", response_model=schemas.SubTaskOut, status_code=201)
def create_subtask(
    task_id: int, payload: schemas.SubTaskCreate, db: Session = Depends(get_db)
):
    task = _get_task(db, task_id)
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="子任务标题不能为空")
    max_position = max((item.position for item in task.subtasks), default=0)
    subtask = models.SubTask(task_id=task.id, title=title, position=max_position + 1)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.put(
    "/{task_id}/subtasks/{subtask_id}", response_model=schemas.SubTaskOut
)
def update_subtask(
    task_id: int,
    subtask_id: int,
    payload: schemas.SubTaskUpdate,
    db: Session = Depends(get_db),
):
    subtask = _get_subtask(db, task_id, subtask_id)
    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        title = data["title"].strip()
        if not title:
            raise HTTPException(status_code=400, detail="子任务标题不能为空")
        data["title"] = title
    for key, value in data.items():
        setattr(subtask, key, value)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=204)
def delete_subtask(
    task_id: int, subtask_id: int, db: Session = Depends(get_db)
):
    subtask = _get_subtask(db, task_id, subtask_id)
    db.delete(subtask)
    db.commit()
