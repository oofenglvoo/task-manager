import { CalendarDays } from 'lucide-react'
import { cn, dueClass, dueLabel } from '../../lib/utils'

export function DueDateBadge({
  dueDate,
  isDone,
}: {
  dueDate: string | null
  isDone: boolean
}) {
  if (!dueDate) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        dueClass(dueDate, isDone),
      )}
    >
      <CalendarDays className="h-3 w-3" />
      {dueLabel(dueDate, isDone)}
    </span>
  )
}
