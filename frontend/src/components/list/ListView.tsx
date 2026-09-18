import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Archive,
  ArchiveRestore,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Task, TaskQuery } from '../../lib/types'
import { cn, dueClass, dueLabel, formatDate, priorityLabel, PRIORITY_META } from '../../lib/utils'
import {
  useArchiveTask,
  useDeleteTask,
  useStatuses,
  useTags,
  useTasks,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { useUI } from '../../store/ui'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Input, Select } from '../ui/Input'
import { LoadingBlock } from '../ui/Spinner'
import { TagChip } from '../ui/Badge'

type SortField = 'position' | 'priority' | 'due_date' | 'created_at' | 'title'

const HEADERS: Array<{ field: SortField; label: string; className?: string }> = [
  { field: 'title', label: '标题' },
  { field: 'priority', label: '优先级', className: 'w-24' },
  { field: 'due_date', label: '截止日期', className: 'w-32' },
  { field: 'created_at', label: '创建时间', className: 'w-32' },
]

export function ListView() {
  const { search, setSearch, priority, setPriority, tagId, setTagId, openTask, openEdit } =
    useUI()
  const { data: statuses = [] } = useStatuses()
  const { data: tags = [] } = useTags()
  const archiveTask = useArchiveTask()
  const deleteTask = useDeleteTask()
  const { push } = useToast()

  const [sort, setSort] = useState<SortField>('position')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [statusId, setStatusId] = useState<number | ''>('')
  const [archived, setArchived] = useState(false)
  const [deleting, setDeleting] = useState<Task | null>(null)

  const query = useMemo<TaskQuery>(
    () => ({
      status_id: statusId === '' ? undefined : statusId,
      priority: priority ?? undefined,
      tag_id: tagId ?? undefined,
      q: search || undefined,
      archived,
      sort,
      order,
    }),
    [statusId, priority, tagId, search, archived, sort, order],
  )

  const { data: tasks = [], isLoading } = useTasks(query)

  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  )

  function toggleSort(field: SortField) {
    if (sort === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setOrder(field === 'title' ? 'asc' : 'desc')
    }
  }

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            placeholder="搜索标题或描述…"
            className="pl-8"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={statusId}
          className="w-32"
          onChange={(event) =>
            setStatusId(event.target.value === '' ? '' : Number(event.target.value))
          }
        >
          <option value="">全部状态</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </Select>
        <Select
          value={priority ?? ''}
          className="w-28"
          onChange={(event) =>
            setPriority(event.target.value === '' ? null : Number(event.target.value))
          }
        >
          <option value="">全部优先级</option>
          <option value={3}>高</option>
          <option value={2}>中</option>
          <option value={1}>低</option>
        </Select>
        <Select
          value={tagId ?? ''}
          className="w-32"
          onChange={(event) =>
            setTagId(event.target.value === '' ? null : Number(event.target.value))
          }
        >
          <option value="">全部标签</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </Select>
        <div className="flex-1" />
        <Button
          variant={archived ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setArchived((prev) => !prev)}
        >
          <Archive className="h-3.5 w-3.5" />
          {archived ? '查看中：已归档' : '已归档'}
        </Button>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="scrollbar-thin flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-line text-left text-xs text-muted">
                {HEADERS.map((header) => (
                  <th key={header.field} className={cn('px-4 py-2 font-medium', header.className)}>
                    <button
                      type="button"
                      onClick={() => toggleSort(header.field)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {header.label}
                      {sort === header.field ? (
                        order === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
                <th className="w-28 px-4 py-2 font-medium">状态</th>
                <th className="px-4 py-2 font-medium">标签</th>
                <th className="w-24 px-4 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const status = task.status_id != null ? statusMap.get(task.status_id) : undefined
                const isDone = task.completed_at != null
                return (
                  <tr
                    key={task.id}
                    className="cursor-pointer border-b border-line/60 transition-colors hover:bg-elevated"
                    onClick={() => openTask(task.id)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-ink', isDone && 'text-muted line-through')}>
                          {task.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={cn('text-xs', PRIORITY_META[task.priority]?.text)}
                      >
                        {priorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className={cn('px-4 py-2 text-xs', dueClass(task.due_date, isDone))}>
                      {task.due_date ? dueLabel(task.due_date, isDone) : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted">
                      {formatDate(task.created_at)}
                    </td>
                    <td className="px-4 py-2">
                      {status ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                          style={{ color: status.color, backgroundColor: `${status.color}1f` }}
                        >
                          {status.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">未分配</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag) => (
                          <TagChip key={tag.id} tag={tag} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          title="编辑"
                          onClick={() => openEdit(task.id)}
                          className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={task.is_archived ? '恢复' : '归档'}
                          onClick={() =>
                            archiveTask.mutate(
                              { id: task.id, isArchived: !task.is_archived },
                              { onError },
                            )
                          }
                          className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
                        >
                          {task.is_archived ? (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="删除"
                          onClick={() => setDeleting(task)}
                          className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                    没有符合条件的任务
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleting != null}
        title="删除任务"
        message={deleting ? `确定要删除「${deleting.title}」吗？` : undefined}
        confirmLabel="删除"
        loading={deleteTask.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteTask.mutate(deleting.id, {
            onSuccess: () => {
              push('任务已删除', 'success')
              setDeleting(null)
            },
            onError: (error) => {
              setDeleting(null)
              onError(error)
            },
          })
        }}
      />
    </div>
  )
}
