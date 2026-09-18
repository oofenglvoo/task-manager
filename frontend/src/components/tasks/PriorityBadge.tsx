import { PRIORITY_META } from '../../lib/utils'
import { cn } from '../../lib/utils'

export function PriorityBadge({
  priority,
  showLabel = true,
}: {
  priority: number
  showLabel?: boolean
}) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META[2]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', meta.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.bg)} />
      {showLabel ? meta.label : null}
    </span>
  )
}
