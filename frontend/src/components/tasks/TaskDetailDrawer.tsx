import { useEffect, useMemo, useState } from 'react'
import { Archive, ArchiveRestore, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import {
  useArchiveTask,
  useDeleteTask,
  useGroups,
  useStatuses,
  useTags,
  useTask,
  useUpdateTask,
} from '../../hooks/queries'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { useToast } from '../../store/toast'
import { useUI } from '../../store/ui'
import { Button } from '../ui/Button'
import { ColorPicker } from '../ui/ColorPicker'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Drawer } from '../ui/Drawer'
import { Input, Select } from '../ui/Input'
import { RichTextEditor } from '../ui/RichTextEditor'
import { Spinner } from '../ui/Spinner'
import { TagPicker } from '../ui/TagPicker'
import { SubTaskList } from './SubTaskList'
import { TaskHistoryTimeline } from './TaskHistoryTimeline'

interface Draft {
  title: string
  statusId: number | ''
  groupId: number | ''
  priority: number
  color: string | null
  dueDate: string
  tagIds: number[]
  description: string
}

/** 把后端的截止值（可能带秒/时区）裁剪成 datetime-local 需要的 `YYYY-MM-DDTHH:MM`。 */
function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return ''
  const text = value.trim()
  if (text.length < 16) return text.slice(0, 10) // 纯日期
  return text.slice(0, 16)
}

function draftFromTask(task: {
  title: string
  status_id: number | null
  group_id: number | null
  priority: number
  color: string | null
  due_date: string | null
  tags: Array<{ id: number }>
  description: string | null
}): Draft {
  return {
    title: task.title,
    statusId: task.status_id ?? '',
    groupId: task.group_id ?? '',
    priority: task.priority,
    color: task.color,
    dueDate: toDatetimeLocal(task.due_date),
    tagIds: task.tags.map((tag) => tag.id),
    description: task.description ?? '',
  }
}

function sameTags(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x - y)
  const sortedB = [...b].sort((x, y) => x - y)
  return sortedA.every((value, index) => value === sortedB[index])
}

export function TaskDetailDrawer() {
  const { selectedTaskId, closeTask } = useUI()
  const { data: task, isLoading } = useTask(selectedTaskId)
  const { data: statuses = [] } = useStatuses()
  const { data: tags = [] } = useTags()
  const { data: groups = [] } = useGroups()
  const { sorted: sortedPriorities } = usePrioritiesMeta()
  const updateTask = useUpdateTask()
  const archiveTask = useArchiveTask()
  const deleteTask = useDeleteTask()
  const { push } = useToast()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(true)

  const taskId = task?.id ?? null
  useEffect(() => {
    setSaveError('')
    setDraft(task ? draftFromTask(task) : null)
    // 仅在切换到另一个任务时重置草稿，避免后台刷新覆盖未保存的编辑。
  }, [taskId])

  const dirty = useMemo(() => {
    if (!task || !draft) return false
    return (
      draft.title !== task.title ||
      draft.statusId !== (task.status_id ?? '') ||
      draft.groupId !== (task.group_id ?? '') ||
      draft.priority !== task.priority ||
      draft.color !== task.color ||
      draft.dueDate !== toDatetimeLocal(task.due_date) ||
      draft.description !== (task.description ?? '') ||
      !sameTags(draft.tagIds, task.tags.map((tag) => tag.id))
    )
  }, [task, draft])

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  function patch(next: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev))
  }

  function save() {
    if (!task || !draft) return
    const title = draft.title.trim()
    if (!title) {
      setSaveError('请输入任务标题')
      return
    }
    setSaveError('')
    updateTask.mutate(
      {
        id: task.id,
        data: {
          title,
          status_id: draft.statusId === '' ? null : draft.statusId,
          group_id: draft.groupId === '' ? null : draft.groupId,
          priority: draft.priority,
          color: draft.color,
          due_date: draft.dueDate || null,
          tag_ids: draft.tagIds,
          description: draft.description.trim() || null,
        },
      },
      {
        onSuccess: () => push('任务已保存', 'success'),
        onError,
      },
    )
  }

  function requestClose() {
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    closeTask()
  }

  const open = selectedTaskId != null

  return (
    <>
      <Drawer open={open} onClose={requestClose}>
        {isLoading || !task || !draft ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <>
            <header className="flex items-start gap-3 border-b border-line bg-surface px-5 py-5">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className={task.completed_at ? 'text-success' : ''}>
                    {task.completed_at ? '已完成' : '进行中'}
                  </span>
                  <span>·</span>
                  <span>#{task.id}</span>
                </div>
                <Input
                  value={draft.title}
                  placeholder="任务标题"
                  className="h-10 text-base font-semibold"
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label="关闭"
                className="rounded-md border border-transparent p-1.5 text-muted transition-colors hover:border-line hover:bg-elevated hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="scrollbar-thin flex-1 space-y-7 overflow-y-auto px-5 py-6">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-ink-soft">状态</span>
                  <Select
                    value={draft.statusId}
                    onChange={(event) =>
                      patch({
                        statusId:
                          event.target.value === '' ? '' : Number(event.target.value),
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
                    value={draft.priority}
                    onChange={(event) => patch({ priority: Number(event.target.value) })}
                  >
                    {sortedPriorities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-ink-soft">分组</span>
                  <Select
                    value={draft.groupId}
                    onChange={(event) =>
                      patch({
                        groupId:
                          event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  >
                    <option value="">未分组</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-ink-soft">截止时间</span>
                  <input
                    type="datetime-local"
                    value={draft.dueDate}
                    onChange={(event) => patch({ dueDate: event.target.value })}
                     className="h-9 w-full rounded border border-line bg-surface px-3 text-sm text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-ink-soft">卡片颜色</span>
                <ColorPicker
                  value={draft.color ?? '#5e6ad2'}
                  onChange={(color) => patch({ color })}
                  onClear={() => patch({ color: null })}
                  clearLabel="按优先级"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-ink-soft">标签</span>
                <TagPicker
                  tags={tags}
                  selected={draft.tagIds}
                  onChange={(tagIds) => patch({ tagIds })}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-ink-soft">任务详情</span>
                <RichTextEditor
                  value={draft.description}
                  onChange={(html) => patch({ description: html })}
                  placeholder="补充说明，支持图片粘贴与文字格式…"
                />
              </div>

              <SubTaskList task={task} />

              <dl className="space-y-1.5 border-t border-line pt-4 text-xs text-muted">
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

              <div className="border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between text-xs font-medium text-ink-soft"
                >
                  <span>历史修改</span>
                  {historyOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {historyOpen ? (
                  <div className="mt-3">
                    <TaskHistoryTimeline taskId={task.id} />
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5">
              <Button
                onClick={() => setConfirmArchive(true)}
                disabled={archiveTask.isPending}
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
              <Button
                variant="primary"
                onClick={save}
                disabled={!dirty || updateTask.isPending}
              >
                {updateTask.isPending ? '保存中…' : '保存'}
              </Button>
            </footer>

            {saveError ? (
              <p className="border-t border-line px-5 py-2 text-xs text-danger">
                {saveError}
              </p>
            ) : null}
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmArchive}
        title={task?.is_archived ? '恢复任务' : '归档任务'}
        message={
          task?.is_archived
            ? '确定要恢复该任务吗？'
            : '归档后任务将从看板/列表中隐藏，可在归档中恢复。确定要归档吗？'
        }
        confirmLabel={task?.is_archived ? '恢复' : '归档'}
        loading={archiveTask.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          if (!task) return
          archiveTask.mutate(
            { id: task.id, isArchived: !task.is_archived },
            {
              onSuccess: () => {
                push(task.is_archived ? '已恢复任务' : '已归档任务', 'success')
                setConfirmArchive(false)
                closeTask()
              },
              onError: (error) => {
                setConfirmArchive(false)
                onError(error)
              },
            },
          )
        }}
      />

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

      <ConfirmDialog
        open={confirmDiscard}
        title="放弃修改"
        message="当前有未保存的修改，确定要放弃并关闭吗？"
        confirmLabel="放弃"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          closeTask()
        }}
      />
    </>
  )
}
