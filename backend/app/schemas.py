import json
from datetime import date, datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator


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
# Group
# --------------------------------------------------------------------------- #
class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#6366f1"
    note: str | None = None


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    note: str | None = None


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    note: str | None = None
    position: int
    task_count: int = 0


# --------------------------------------------------------------------------- #
# Priority
# --------------------------------------------------------------------------- #
class PriorityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#6b7280"
    level: int | None = Field(default=None, ge=1)


class PriorityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    level: int | None = Field(default=None, ge=1)


class PriorityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    level: int
    position: int
    task_count: int = 0


# --------------------------------------------------------------------------- #
# SubTask
# --------------------------------------------------------------------------- #
class SubTaskCreate(BaseModel):    title: str = Field(min_length=1, max_length=500)


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
    group_id: int | None = None
    description: str | None = None
    priority: int | None = None
    due_date: date | None = None
    tag_ids: list[int] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    status_id: int | None = None
    group_id: int | None = None
    description: str | None = None
    priority: int | None = None
    due_date: date | None = None
    tag_ids: list[int] | None = None
    position: int | None = None


class TaskMove(BaseModel):
    status_id: int | None = None
    group_id: int | None = None
    position: int | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status_id: int | None
    group_id: int | None
    title: str
    description: str | None
    priority: int
    due_date: date | None
    position: int
    is_archived: bool
    created_at: UtcDatetime
    updated_at: UtcDatetime
    completed_at: UtcDatetime | None
    group: GroupOut | None = None
    tags: list[TagOut] = Field(default_factory=list)
    subtasks: list[SubTaskOut] = Field(default_factory=list)


class TaskHistorySnapshot(BaseModel):
    title: str
    status_name: str | None = None
    group_name: str | None = None
    priority: int = 2
    due_date: date | None = None
    tag_names: list[str] = Field(default_factory=list)
    description: str | None = None


class TaskHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: UtcDatetime
    snapshot: TaskHistorySnapshot

    @field_validator("snapshot", mode="before")
    @classmethod
    def _parse_snapshot(cls, value):
        if isinstance(value, str):
            return json.loads(value)
        return value


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
    name: str
    color: str
    level: int
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
    group_by: bool
    background_url: str | None
    bg_opacity: float
    card_opacity: float
    panel_opacity: float


class PreferenceUpdate(BaseModel):
    theme: str | None = None
    card_size: str | None = None
    compact: bool | None = None
    group_by: bool | None = None
    background_url: str | None = None
    bg_opacity: float | None = Field(default=None, ge=0, le=1)
    card_opacity: float | None = Field(default=None, ge=0, le=1)
    panel_opacity: float | None = Field(default=None, ge=0, le=1)


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


class ExportGroup(BaseModel):
    id: int
    name: str
    color: str = "#6366f1"
    note: str | None = None
    position: int = 0


class ExportPriority(BaseModel):
    id: int
    name: str
    color: str = "#6b7280"
    level: int = 1
    position: int = 0


class ExportSubTask(BaseModel):
    title: str
    is_done: bool = False
    position: int = 0


class ExportHistory(BaseModel):
    created_at: datetime | None = None
    snapshot: TaskHistorySnapshot


class ExportTask(BaseModel):
    id: int
    status_id: int | None = None
    group_id: int | None = None
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
    history: list[ExportHistory] = Field(default_factory=list)


class ExportData(BaseModel):
    version: int = 1
    exported_at: datetime | None = None
    statuses: list[ExportStatus] = Field(default_factory=list)
    tags: list[ExportTag] = Field(default_factory=list)
    groups: list[ExportGroup] = Field(default_factory=list)
    priorities: list[ExportPriority] = Field(default_factory=list)
    tasks: list[ExportTask] = Field(default_factory=list)


class ImportResult(BaseModel):
    statuses: int
    tags: int
    groups: int
    priorities: int = 0
    tasks: int
    subtasks: int
