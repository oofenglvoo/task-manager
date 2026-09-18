import type { ReactNode } from 'react'
import { CheckSquare, Clock, Pencil } from 'lucide-react'
import type { CardSizeStyle } from '../../store/preferences'
import type { Status, Task } from '../../lib/types'
import {
  cn,
  dueBadgeClass,
  dueLabel,
  formatDateTime,
  noteSurfaceClass,
  noteTilt,
} from '../../lib/utils'
import { TagChip } from '../ui/Badge'
import { Checkbox } from '../ui/Checkbox'
import { PriorityMenu } from './PriorityMenu'
import { StatusMenu } from './StatusMenu'

interface TaskCardProps {
  task: Task
  status?: Status
  statuses?: Status[]
  style: CardSizeStyle
  compact?: boolean
  handle?: ReactNode
  onOpen?: () => void
  onEdit?: () => void
  onStatusChange?: (statusId: number | null) => void
  onPriorityChange?: (priority: number) => void
  onToggleDone?: () => void
}

export function TaskCard({
  task,
  status,
  statuses = [],
  style,
  compact,
  handle,
  onOpen,
  onEdit,
  onStatusChange,
  onPriorityChange,
  onToggleDone,
}: TaskCardProps) {
  const doneCount = task.subtasks.filter((item) => item.is_done).length
  const isDone = task.completed_at != null
  const tilt = noteTilt(task.id)

  const hasFooter = Boolean(task.due_date) || task.subtasks.length > 0

  return (
    <div
      onClick={onOpen}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={cn(
        'group relative flex h-full flex-col rounded-md border border-line/60 shadow-note transition-all duration-150',
        noteSurfaceClass(task.priority, isDone),
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
          {onEdit ? (
            <button
              type="button"
              aria-label="编辑任务"
              title="编辑任务"
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
              className="rounded p-0.5 text-muted opacity-0 transition-opacity hover:bg-elevated hover:text-ink focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 group-hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onStatusChange ? (
            <StatusMenu status={status} statuses={statuses} onChange={onStatusChange} />
          ) : status ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              style={{ color: status.color, backgroundColor: `${status.color}1f` }}
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
          className="mt-1.5 inline-flex w-fit max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px]"
          style={{ color: task.group.color, backgroundColor: `${task.group.color}1f` }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-sm"
            style={{ backgroundColor: task.group.color }}
          />
          <span className="truncate">{task.group.name}</span>
        </span>
      ) : null}

      {!compact && task.description ? (
        <p className={cn('mt-1.5 text-xs leading-relaxed text-ink-soft/80', style.descLines)}>
          {task.description}
        </p>
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
