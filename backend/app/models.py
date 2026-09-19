from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

PRIORITY_LOW = 1
PRIORITY_MEDIUM = 2
PRIORITY_HIGH = 3


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Status(Base):
    __tablename__ = "statuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#94a3b8")
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    tasks: Mapped[list["Task"]] = relationship(back_populates="status")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#38bdf8")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    tasks: Mapped[list["Task"]] = relationship(
        secondary=task_tags, back_populates="tags"
    )


class Group(Base):
    __tablename__ = "groups"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#6366f1")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    tasks: Mapped[list["Task"]] = relationship(back_populates="group")


class Priority(Base):
    __tablename__ = "priorities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#6b7280")
    # 权重等级：数值越大越高（用于图表评分/排序），可与 position 不同。
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    status_id: Mapped[int | None] = mapped_column(
        ForeignKey("statuses.id", ondelete="SET NULL"), nullable=True, index=True
    )
    group_id: Mapped[int | None] = mapped_column(
        ForeignKey("groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=PRIORITY_MEDIUM)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    status: Mapped["Status | None"] = relationship(back_populates="tasks")
    group: Mapped["Group | None"] = relationship(back_populates="tasks")
    tags: Mapped[list["Tag"]] = relationship(
        secondary=task_tags, back_populates="tasks"
    )
    subtasks: Mapped[list["SubTask"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="SubTask.position",
    )
    history: Mapped[list["TaskHistory"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="TaskHistory.created_at",
    )


class TaskHistory(Base):
    __tablename__ = "task_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 保存时的任务主字段快照（JSON，description 已去除图片）。
    snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    task: Mapped["Task"] = relationship(back_populates="history")


class SubTask(Base):
    __tablename__ = "subtasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    task: Mapped["Task"] = relationship(back_populates="subtasks")


class Preference(Base):
    __tablename__ = "preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    theme: Mapped[str] = mapped_column(String(20), nullable=False, default="system")
    card_size: Mapped[str] = mapped_column(String(20), nullable=False, default="md")
    compact: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    group_by: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    background_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bg_opacity: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    card_opacity: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    panel_opacity: Mapped[float] = mapped_column(Float, nullable=False, default=0.82)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )
