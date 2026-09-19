import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { CheckSquare, Clock, Pencil } from 'lucide-react'
import type { CardSizeStyle } from '../../store/preferences'
import type { Status, Task } from '../../lib/types'
import {
  cn,
  dueBadgeClass,
  dueLabel,
  formatDateTime,
  noteTilt,
} from '../../lib/utils'
import { noteSurfaceClassFor } from '../../lib/priority'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { sanitizeDescription } from '../../lib/sanitizeHtml'
import { TagChip } from '../ui/Badge'
import { Checkbox } from '../ui/Checkbox'
import { PriorityMenu } from './PriorityMenu'
import { StatusMenu } from './StatusMenu'

const SUBTASK_LIMIT = 5

interface TaskCardProps {
  task: Task
  status?: Status
  statuses?: Status[]
  style: CardSizeStyle
  compact?: boolean
  handle?: ReactNode
  onOpen?: () => void
  onStatusChange?: (statusId: number | null) => void
  onPriorityChange?: (priority: number) => void
  onToggleDone?: () => void
  onToggleSubtask?: (subtaskId: number, isDone: boolean) => void
}

export function TaskCard({
  task,
  status,
  statuses = [],
  style,
  compact,
  handle,
  onOpen,
  onStatusChange,
  onPriorityChange,
  onToggleDone,
  onToggleSubtask,
}: TaskCardProps) {
  const doneCount = task.subtasks.filter((item) => item.is_done).length
  const isDone = task.completed_at != null
  const tilt = noteTilt(task.id)
  const { priorities } = usePrioritiesMeta()
  const descriptionHtml = useMemo(
    () => sanitizeDescription(task.description, { allowImages: false }),
    [task.description],
  )
  const visibleSubtasks = task.subtasks.slice(0, SUBTASK_LIMIT)
  const hiddenSubtasks = task.subtasks.length - visibleSubtasks.length

  const hasFooter = Boolean(task.due_date) || task.subtasks.length > 0

  return (
    <div
      onClick={onOpen}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={cn(
        'group relative flex h-full flex-col rounded-md border border-line/60 shadow-note transition-all duration-150',
        noteSurfaceClassFor(priorities, task.priority, isDone),
        style.padding,
        onOpen && 'cursor-pointer hover:z-10 hover:-translate-y-0.5 hover:rotate-0 hover:shadow-panel',
        'motion-reduce:rotate-0 motion-reduce:transform-none',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div
          className="flex min-w-0 items-center gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {onToggleDone ? (
            <Checkbox
              checked={isDone}
              ariaLabel={isDone ? '取消完成' : '标记完成'}
              onChange={() => onToggleDone()}
            />
          ) : null}
          {onPriorityChange ? (
            <PriorityMenu priority={task.priority} onChange={onPriorityChange} />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {handle}
          {onOpen ? (
            <button
              type="button"
              aria-label="编辑任务"
              title="编辑任务"
              onClick={(event) => {
                event.stopPropagation()
                onOpen()
              }}
              className="rounded border border-line bg-surface p-0.5 text-muted opacity-0 transition-opacity hover:bg-elevated hover:text-ink focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 group-hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onStatusChange ? (
            <StatusMenu status={status} statuses={statuses} onChange={onStatusChange} />
          ) : status ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{ color: status.color, borderColor: `${status.color}99`, backgroundColor: `${status.color}26` }}
            >
              {status.name}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen?.()
        }}
        className={cn(
          'rounded text-left font-medium leading-snug text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
          style.title,
          isDone && 'text-muted line-through',
        )}
      >
        {task.title}
      </button>

      {task.group ? (
        <span
          className="mt-1.5 inline-flex w-fit max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
          style={{ color: task.group.color, borderColor: `${task.group.color}99`, backgroundColor: `${task.group.color}26` }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-sm"
            style={{ backgroundColor: task.group.color }}
          />
          <span className="truncate">{task.group.name}</span>
        </span>
      ) : null}

      {descriptionHtml ? (
        <div
          className={cn(
            'rich-content mt-1.5 break-words text-xs leading-relaxed text-ink-soft/80',
            style.descLines,
          )}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : null}

      {!compact && task.subtasks.length > 0 ? (
        <ul className="mt-2.5 space-y-1" onClick={(event) => event.stopPropagation()}>
          {visibleSubtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-1.5">
              <Checkbox
                checked={subtask.is_done}
                ariaLabel={subtask.title}
                disabled={!onToggleSubtask}
                onChange={(checked) => onToggleSubtask?.(subtask.id, checked)}
              />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-xs text-ink-soft',
                  subtask.is_done && 'text-muted line-through',
                )}
              >
                {subtask.title}
              </span>
            </li>
          ))}
          {hiddenSubtasks > 0 ? (
            <li className="pl-[1.375rem] text-[11px] text-muted">
              还有 {hiddenSubtasks} 个…
            </li>
          ) : null}
        </ul>
      ) : null}

      {!compact && task.tags.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} variant={style.tag} />
          ))}
        </div>
      ) : null}

      {hasFooter ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink/10 pt-2.5 text-xs text-ink-soft/80">
          {task.due_date ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                compact ? '' : dueBadgeClass(task.due_date, isDone),
              )}
            >
              <Clock className="h-3 w-3" />
              {dueLabel(task.due_date, isDone)}
            </span>
          ) : null}
          {task.subtasks.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {doneCount}/{task.subtasks.length}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto pt-2.5 text-[11px] leading-relaxed text-ink-soft/60">
        <div>创建 {formatDateTime(task.created_at)}</div>
        <div>修改 {formatDateTime(task.updated_at)}</div>
      </div>
    </div>
  )
}
