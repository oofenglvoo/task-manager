import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { SubTask, Task } from '../../lib/types'
import { cn } from '../../lib/utils'
import {
  useCreateSubtask,
  useDeleteSubtask,
  usePinSubtask,
  useReorderSubtasks,
  useUpdateSubtask,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Checkbox } from '../ui/Checkbox'
import { Input } from '../ui/Input'

export function SubTaskList({ task }: { task: Task }) {
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const createSubtask = useCreateSubtask()
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()
  const reorderSubtasks = useReorderSubtasks()
  const pinSubtask = usePinSubtask()
  const { push } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const done = task.subtasks.filter((item) => item.is_done).length
  const progress = task.subtasks.length
    ? Math.round((done / task.subtasks.length) * 100)
    : 0

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  function submit() {
    const value = title.trim()
    if (!value) return
    createSubtask.mutate(
      { taskId: task.id, title: value },
      {
        onSuccess: () => setTitle(''),
        onError,
      },
    )
  }

  function startEdit(id: number, current: string) {
    setEditingId(id)
    setEditingTitle(current)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  function commitEdit() {
    if (editingId == null) return
    const value = editingTitle.trim()
    const current = task.subtasks.find((item) => item.id === editingId)
    if (!value || (current && value === current.title)) {
      cancelEdit()
      return
    }
    updateSubtask.mutate(
      { taskId: task.id, id: editingId, data: { title: value } },
      { onSuccess: cancelEdit, onError },
    )
  }

  function toggleDone(subtask: SubTask, checked: boolean) {
    updateSubtask.mutate(
      { taskId: task.id, id: subtask.id, data: { is_done: checked } },
      { onError },
    )
  }

  function pinToTop(subtask: SubTask) {
    pinSubtask.mutate({ taskId: task.id, id: subtask.id }, { onError })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = task.subtasks.map((item) => item.id)
    const from = ids.indexOf(Number(active.id))
    const to = ids.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    reorderSubtasks.mutate(
      { taskId: task.id, orderedIds: arrayMove(ids, from, to) },
      { onError },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-ink-soft">子任务</h3>
        {task.subtasks.length > 0 ? (
          <span className="text-xs text-muted">
            {done}/{task.subtasks.length} · {progress}%
          </span>
        ) : null}
      </div>

      {task.subtasks.length > 0 ? (
        <div className="h-1 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {task.subtasks.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={task.subtasks.map((subtask) => subtask.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1">
              {task.subtasks.map((subtask) => (
                <SubTaskRow
                  key={subtask.id}
                  subtask={subtask}
                  editing={editingId === subtask.id}
                  editingTitle={editingTitle}
                  onEditingTitleChange={setEditingTitle}
                  onStartEdit={() => startEdit(subtask.id, subtask.title)}
                  onCommitEdit={commitEdit}
                  onCancelEdit={cancelEdit}
                  onToggleDone={(checked) => toggleDone(subtask, checked)}
                  onPin={() => pinToTop(subtask)}
                  onDelete={() =>
                    deleteSubtask.mutate(
                      { taskId: task.id, id: subtask.id },
                      { onError },
                    )
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      <div className="flex items-center gap-2">
        <Input
          value={title}
          placeholder="添加子任务…"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim() || createSubtask.isPending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:bg-elevated hover:text-ink disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface SubTaskRowProps {
  subtask: SubTask
  editing: boolean
  editingTitle: string
  onEditingTitleChange: (value: string) => void
  onStartEdit: () => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onToggleDone: (checked: boolean) => void
  onPin: () => void
  onDelete: () => void
}

function SubTaskRow({
  subtask,
  editing,
  editingTitle,
  onEditingTitleChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onToggleDone,
  onPin,
  onDelete,
}: SubTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: subtask.id, disabled: editing })

  const rowClass =
    'group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-elevated'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(rowClass, isDragging && 'z-10 bg-elevated opacity-60')}
    >
      <button
        type="button"
        title="拖拽排序"
        aria-label="拖拽排序"
        disabled={editing}
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded border border-transparent p-1 text-muted opacity-0 transition-opacity hover:border-line hover:bg-surface hover:text-ink focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 group-hover:opacity-100 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-0"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <Checkbox
        checked={subtask.is_done}
        ariaLabel={subtask.title}
        onChange={onToggleDone}
      />

      {editing ? (
        <Input
          autoFocus
          value={editingTitle}
          className="h-8 flex-1"
          onChange={(event) => onEditingTitleChange(event.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onCommitEdit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              onCancelEdit()
            }
          }}
        />
      ) : (
        <span
          title="点击编辑"
          onClick={onStartEdit}
          className={cn(
            'min-w-0 flex-1 cursor-text truncate text-sm',
            subtask.is_done && 'text-muted line-through',
          )}
        >
          {subtask.title}
        </span>
      )}

      <button
        type="button"
        title="置顶（挪到最前）"
        aria-label="置顶"
        onClick={onPin}
        className="rounded border border-line bg-surface p-1 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 group-hover:opacity-100"
      >
        <Pin className="h-3.5 w-3.5" />
      </button>

      {!editing ? (
        <>
          <button
            type="button"
            title="编辑"
            onClick={onStartEdit}
            className="rounded border border-line bg-surface p-1 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="删除"
            onClick={onDelete}
            className="rounded border border-line bg-surface p-1 text-muted opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      ) : null}
    </li>
  )
}
