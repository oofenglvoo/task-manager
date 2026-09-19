import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Task } from '../../lib/types'
import { useCreateSubtask, useDeleteSubtask, useUpdateSubtask } from '../../hooks/queries'
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
  const { push } = useToast()

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
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <ul className="space-y-1">
        {task.subtasks.map((subtask) =>
          editingId === subtask.id ? (
            <li key={subtask.id} className="flex items-center gap-2 px-1 py-0.5">
              <Checkbox
                checked={subtask.is_done}
                ariaLabel={subtask.title}
                onChange={(checked) =>
                  updateSubtask.mutate(
                    { taskId: task.id, id: subtask.id, data: { is_done: checked } },
                    { onError },
                  )
                }
              />
              <Input
                autoFocus
                value={editingTitle}
                className="h-8 flex-1"
                onChange={(event) => setEditingTitle(event.target.value)}
                onBlur={commitEdit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commitEdit()
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelEdit()
                  }
                }}
              />
            </li>
          ) : (
            <li
              key={subtask.id}
              className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-elevated"
            >
              <Checkbox
                checked={subtask.is_done}
                ariaLabel={subtask.title}
                onChange={(checked) =>
                  updateSubtask.mutate(
                    { taskId: task.id, id: subtask.id, data: { is_done: checked } },
                    { onError },
                  )
                }
              />
              <span
                title="点击编辑"
                onClick={() => startEdit(subtask.id, subtask.title)}
                className={
                  subtask.is_done
                    ? 'flex-1 cursor-text text-sm text-muted line-through'
                    : 'flex-1 cursor-text text-sm'
                }
              >
                {subtask.title}
              </span>
              <button
                type="button"
                title="编辑"
                onClick={() => startEdit(subtask.id, subtask.title)}
                className="rounded p-1 text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="删除"
                onClick={() =>
                  deleteSubtask.mutate(
                    { taskId: task.id, id: subtask.id },
                    { onError },
                  )
                }
                className="rounded p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ),
        )}
      </ul>

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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
