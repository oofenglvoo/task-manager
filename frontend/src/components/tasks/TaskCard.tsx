import { CheckSquare, Clock } from 'lucide-react'
import type { Status, Task } from '../../lib/types'
import { cn, dueClass, dueLabel, PRIORITY_META, priorityLabel } from '../../lib/utils'
import { TagChip } from '../ui/Badge'
import { StatusMenu } from './StatusMenu'

interface TaskCardProps {
  task: Task
  status?: Status
  statuses?: Status[]
  onOpen?: () => void
  onStatusChange?: (statusId: number | null) => void
}

export function TaskCard({
  task,
  status,
  statuses = [],
  onOpen,
  onStatusChange,
}: TaskCardProps) {
  const doneCount = task.subtasks.filter((item) => item.is_done).length
  const isDone = task.completed_at != null
  const meta = PRIORITY_META[task.priority] ?? PRIORITY_META[2]

  return (
    <div
      onClick={onOpen}
      className={cn(
        'group relative overflow-visible rounded-lg border border-line bg-surface p-4 transition-all duration-150',
        onOpen ? 'cursor-pointer hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel' : '',
        isDone && 'opacity-70',
      )}
    >
      <span
        className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
        style={{ backgroundColor: meta.color }}
      />

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 text-xs', meta.text)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', meta.bg)} />
          {priorityLabel(task.priority)}
        </span>
        {onStatusChange ? (
          <StatusMenu
            status={status}
            statuses={statuses}
            onChange={onStatusChange}
          />
        ) : status ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            style={{ color: status.color, backgroundColor: `${status.color}1f` }}
          >
            {status.name}
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          'text-sm font-medium leading-snug text-ink',
          isDone && 'text-muted line-through',
        )}
      >
        {task.title}
      </h3>

      {task.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
          {task.description}
        </p>
      ) : null}

      {task.tags.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3 border-t border-line/70 pt-2.5 text-xs text-muted">
        {task.due_date ? (
          <span className={cn('inline-flex items-center gap-1', dueClass(task.due_date, isDone))}>
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
    </div>
  )
}
