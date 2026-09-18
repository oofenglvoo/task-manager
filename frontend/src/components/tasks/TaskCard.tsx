import type { ReactNode } from 'react'
import { CheckSquare, Clock } from 'lucide-react'
import type { CardSizeStyle } from '../../store/preferences'
import type { Project, Status, Task } from '../../lib/types'
import { cn, dueBadgeClass, dueLabel, PRIORITY_META } from '../../lib/utils'
import { ColorDot, TagChip } from '../ui/Badge'
import { Checkbox } from '../ui/Checkbox'
import { PriorityMenu } from './PriorityMenu'
import { StatusMenu } from './StatusMenu'

interface TaskCardProps {
  task: Task
  status?: Status
  statuses?: Status[]
  project?: Project
  showProject?: boolean
  style: CardSizeStyle
  compact?: boolean
  handle?: ReactNode
  onOpen?: () => void
  onStatusChange?: (statusId: number | null) => void
  onPriorityChange?: (priority: number) => void
  onToggleDone?: () => void
}

export function TaskCard({
  task,
  status,
  statuses = [],
  project,
  showProject,
  style,
  compact,
  handle,
  onOpen,
  onStatusChange,
  onPriorityChange,
  onToggleDone,
}: TaskCardProps) {
  const doneCount = task.subtasks.filter((item) => item.is_done).length
  const isDone = task.completed_at != null
  const meta = PRIORITY_META[task.priority] ?? PRIORITY_META[2]

  const hasFooter =
    Boolean(task.due_date) ||
    task.subtasks.length > 0 ||
    (showProject && Boolean(project))

  return (
    <div
      onClick={onOpen}
      className={cn(
        'group relative flex h-full flex-col rounded-lg border border-line bg-surface transition-all duration-150',
        style.padding,
        onOpen && 'cursor-pointer hover:border-line-strong hover:shadow-panel',
        onOpen && !compact && 'hover:-translate-y-0.5 motion-reduce:transform-none',
      )}
    >
      <span
        className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
        style={{ backgroundColor: meta.color }}
      />

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
          ) : (
            <span className={cn('inline-flex items-center gap-1 text-xs', meta.text)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.bg)} />
              {meta.label}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {handle}
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

      {!compact && task.description ? (
        <p
          className={cn(
            'mt-1.5 text-xs leading-relaxed text-muted',
            style.descLines,
          )}
        >
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
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/70 pt-2.5 text-xs text-muted">
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
          {showProject && project ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <ColorDot color={project.color} className="h-2 w-2" />
              <span className="truncate">{project.name}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
