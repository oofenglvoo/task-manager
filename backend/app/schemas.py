from datetime import date, datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer


def _serialize_utc(value: datetime) -> str:
    return value.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


UtcDatetime = Annotated[datetime, PlainSerializer(_serialize_utc, return_type=str)]


# --------------------------------------------------------------------------- #
# Status
# --------------------------------------------------------------------------- #
class StatusCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#94a3b8"
    is_done: bool = False


class StatusUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    is_done: bool | None = None


class StatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    is_done: bool
    position: int


# --------------------------------------------------------------------------- #
# Tag
# --------------------------------------------------------------------------- #
class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#38bdf8"


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str


# --------------------------------------------------------------------------- #
# SubTask
# --------------------------------------------------------------------------- #
class SubTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)


class SubTaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    is_done: bool | None = None


class SubTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    title: str
    is_done: bool
    position: int


# --------------------------------------------------------------------------- #
# Task
# --------------------------------------------------------------------------- #
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    status_id: int | None = None
    description: str | None = None
    priority: int = Field(default=2, ge=1, le=3)
    due_date: date | None = None
    tag_ids: list[int] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    status_id: int | None = None
    description: str | None = None
    priority: int | None = Field(default=None, ge=1, le=3)
    due_date: date | None = None
    tag_ids: list[int] | None = None
    position: int | None = None


class TaskMove(BaseModel):
    status_id: int | None = None
    position: int | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status_id: int | None
    title: str
    description: str | None
    priority: int
    due_date: date | None
    position: int
    is_archived: bool
    created_at: UtcDatetime
    updated_at: UtcDatetime
    completed_at: UtcDatetime | None
    tags: list[TagOut] = Field(default_factory=list)
    subtasks: list[SubTaskOut] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Bulk operations
# --------------------------------------------------------------------------- #
class ReorderPayload(BaseModel):
    ordered_ids: list[int]


class ArchivePayload(BaseModel):
    is_archived: bool = True


# --------------------------------------------------------------------------- #
# Stats
# --------------------------------------------------------------------------- #
class StatusStat(BaseModel):
    status_id: int | None
    name: str
    color: str
    is_done: bool
    count: int


class PriorityStat(BaseModel):
    priority: int
    count: int


class StatsOut(BaseModel):
    total: int
    active: int
    archived: int
    completed: int
    completion_rate: float
    overdue: int
    due_soon: int
    by_status: list[StatusStat]
    by_priority: list[PriorityStat]


# --------------------------------------------------------------------------- #
# Preferences
# --------------------------------------------------------------------------- #
class PreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    theme: str
    card_size: str
    compact: bool
    background_url: str | None


class PreferenceUpdate(BaseModel):
    theme: str | None = None
    card_size: str | None = None
    compact: bool | None = None
    background_url: str | None = None


class BackgroundOut(BaseModel):
    url: str


# --------------------------------------------------------------------------- #
# Export / Import
# --------------------------------------------------------------------------- #
class ExportStatus(BaseModel):
    id: int
    name: str
    color: str = "#94a3b8"
    is_done: bool = False
    position: int = 0


class ExportTag(BaseModel):
    id: int
    name: str
    color: str = "#38bdf8"


class ExportSubTask(BaseModel):
    title: str
    is_done: bool = False
    position: int = 0


class ExportTask(BaseModel):
    id: int
    status_id: int | None = None
    title: str
    description: str | None = None
    priority: int = 2
    due_date: date | None = None
    position: int = 0
    is_archived: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None
    tag_ids: list[int] = Field(default_factory=list)
    subtasks: list[ExportSubTask] = Field(default_factory=list)


class ExportData(BaseModel):
    version: int = 1
    exported_at: datetime | None = None
    statuses: list[ExportStatus] = Field(default_factory=list)
    tags: list[ExportTag] = Field(default_factory=list)
    tasks: list[ExportTask] = Field(default_factory=list)


class ImportResult(BaseModel):
    statuses: int
    tags: int
    tasks: int
    subtasks: int
