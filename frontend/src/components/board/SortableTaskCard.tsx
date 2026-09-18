import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Status, Task } from '../../lib/types'
import { cn } from '../../lib/utils'
import { useUI } from '../../store/ui'
import { TaskCard } from '../tasks/TaskCard'

interface SortableTaskCardProps {
  task: Task
  status?: Status
  statuses: Status[]
  onStatusChange: (taskId: number, statusId: number | null) => void
  disabled?: boolean
}

export function SortableTaskCard({
  task,
  status,
  statuses,
  onStatusChange,
  disabled,
}: SortableTaskCardProps) {
  const { openTask } = useUI()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      className={cn(isDragging && 'z-10 opacity-40')}
    >
      <TaskCard
        task={task}
        status={status}
        statuses={statuses}
        onOpen={() => openTask(task.id)}
        onStatusChange={(statusId) => onStatusChange(task.id, statusId)}
      />
    </div>
  )
}
