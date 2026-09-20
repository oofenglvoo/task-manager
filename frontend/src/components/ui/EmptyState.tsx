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
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line-strong/60 px-8 py-16 text-center">
      {icon ? <div className="text-muted [&_svg]:h-8 [&_svg]:w-8">{icon}</div> : null}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description ? (
          <p className="max-w-xs text-xs leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
