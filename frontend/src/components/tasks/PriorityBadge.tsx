import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'

export function PriorityBadge({
  priority,
  showLabel = true,
}: {
  priority: number
  showLabel?: boolean
}) {
  const { byId } = usePrioritiesMeta()
  const item = byId(priority)
  const color = item?.color ?? '#6b7280'
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {showLabel ? item?.name ?? `优先级 ${priority}` : null}
    </span>
  )
}
