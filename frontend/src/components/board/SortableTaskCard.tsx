import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CardSizeStyle } from '../../store/preferences'
import type { Status, Task } from '../../lib/types'
import { cn } from '../../lib/utils'
import { useUI } from '../../store/ui'
import { TaskCard } from '../tasks/TaskCard'

interface SortableTaskCardProps {
  task: Task
  status?: Status
  statuses: Status[]
  style: CardSizeStyle
  compact?: boolean
  onStatusChange: (taskId: number, statusId: number | null) => void
  onPriorityChange: (taskId: number, priority: number) => void
  onToggleDone: (task: Task) => void
  disabled?: boolean
}

export function SortableTaskCard({
  task,
  status,
  statuses,
  style,
  compact,
  onStatusChange,
  onPriorityChange,
  onToggleDone,
  disabled,
}: SortableTaskCardProps) {
  const { openTask, openEdit } = useUI()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled })

  const handle = disabled ? null : (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="拖拽排序"
      onClick={(event) => event.stopPropagation()}
      className="cursor-grab touch-none rounded p-0.5 text-muted opacity-0 transition-opacity hover:bg-elevated hover:text-ink focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 group-hover:opacity-100 active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'h-full [content-visibility:auto] [contain-intrinsic-size:auto_180px]',
        isDragging && 'z-10 opacity-40',
      )}
    >
      <TaskCard
        task={task}
        status={status}
        statuses={statuses}
        style={style}
        compact={compact}
        handle={handle}
        onOpen={() => openTask(task.id)}
        onEdit={() => openEdit(task.id)}
        onStatusChange={(statusId) => onStatusChange(task.id, statusId)}
        onPriorityChange={(priority) => onPriorityChange(task.id, priority)}
        onToggleDone={() => onToggleDone(task)}
      />
    </div>
  )
}
