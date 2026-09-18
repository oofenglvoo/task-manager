import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center">
      {icon ? <div className="text-muted">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
