import { useEffect, useState } from 'react'
import { Archive, ArchiveRestore, Pencil, Trash2, X } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import {
  useArchiveTask,
  useDeleteTask,
  useStatuses,
  useTags,
  useTask,
  useUpdateTask,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { useUI } from '../../store/ui'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Drawer } from '../ui/Drawer'
import { Select, Textarea } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import { TagPicker } from '../ui/TagPicker'
import { SubTaskList } from './SubTaskList'

export function TaskDetailDrawer() {
  const { selectedTaskId, closeTask, openEdit } = useUI()
  const { data: task, isLoading } = useTask(selectedTaskId)
  const { data: statuses = [] } = useStatuses()
  const { data: tags = [] } = useTags()
  const updateTask = useUpdateTask()
  const archiveTask = useArchiveTask()
  const deleteTask = useDeleteTask()
  const { push } = useToast()
  const [description, setDescription] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setDescription(task?.description ?? '')
  }, [task?.id, task?.description])

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  function patch(data: Parameters<typeof updateTask.mutate>[0]['data']) {
    if (!task) return
    updateTask.mutate({ id: task.id, data }, { onError })
  }

  const open = selectedTaskId != null

  return (
    <>
      <Drawer open={open} onClose={closeTask}>
        {isLoading || !task ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <>
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className={task.completed_at ? 'text-success' : ''}>
                    {task.completed_at ? '已完成' : '进行中'}
                  </span>
                  <span>·</span>
                  <span>#{task.id}</span>
                </div>
                <h2 className="text-base font-semibold leading-snug text-ink">
                  {task.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeTask}
                className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-ink-soft">状态</span>
                  <Select
                    value={task.status_id ?? ''}
                    onChange={(event) =>
                      patch({
                        status_id:
                          event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">未分配</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-ink-soft">优先级</span>
                  <Select
                    value={task.priority}
                    onChange={(event) => patch({ priority: Number(event.target.value) })}
                  >
                    <option value={1}>低</option>
                    <option value={2}>中</option>
                    <option value={3}>高</option>
                  </Select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink-soft">截止日期</span>
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(event) => patch({ due_date: event.target.value || null })}
                  className="h-9 w-full rounded border border-line bg-canvas px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-ink-soft">标签</span>
                <TagPicker
                  tags={tags}
                  selected={task.tags.map((tag) => tag.id)}
                  onChange={(tagIds) => patch({ tag_ids: tagIds })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-soft">描述</span>
                  {description !== (task.description ?? '') ? (
                    <button
                      type="button"
                      onClick={() => patch({ description: description.trim() || null })}
                      className="text-xs text-accent hover:text-accent-hover"
                    >
                      保存描述
                    </button>
                  ) : null}
                </div>
                <Textarea
                  rows={4}
                  value={description}
                  placeholder="补充说明…"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <SubTaskList task={task} />

              <dl className="space-y-1 border-t border-line pt-4 text-xs text-muted">
                <div className="flex justify-between">
                  <dt>创建时间</dt>
                  <dd>{formatDateTime(task.created_at)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>更新时间</dt>
                  <dd>{formatDateTime(task.updated_at)}</dd>
                </div>
                {task.completed_at ? (
                  <div className="flex justify-between">
                    <dt>完成时间</dt>
                    <dd>{formatDateTime(task.completed_at)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <footer className="flex items-center gap-2 border-t border-line px-5 py-3">
              <Button onClick={() => openEdit(task.id)}>
                <Pencil className="h-3.5 w-3.5" />
                编辑
              </Button>
              <Button
                onClick={() =>
                  archiveTask.mutate(
                    { id: task.id, isArchived: !task.is_archived },
                    {
                      onSuccess: () => {
                        push(task.is_archived ? '已恢复任务' : '已归档任务', 'success')
                        closeTask()
                      },
                      onError,
                    },
                  )
                }
              >
                {task.is_archived ? (
                  <ArchiveRestore className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                {task.is_archived ? '恢复' : '归档'}
              </Button>
              <div className="flex-1" />
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </Button>
            </footer>
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        title="删除任务"
        message="删除后无法恢复，确定要删除该任务吗？"
        confirmLabel="删除"
        loading={deleteTask.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!task) return
          deleteTask.mutate(task.id, {
            onSuccess: () => {
              push('任务已删除', 'success')
              setConfirmDelete(false)
              closeTask()
            },
            onError: (error) => {
              setConfirmDelete(false)
              onError(error)
            },
          })
        }}
      />
    </>
  )
}
