import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function StatCard({
  label,
  value,
  suffix,
  tone,
  icon,
}: {
  label: string
  value: number | string
  suffix?: string
  tone?: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {icon ? <span className="rounded-md bg-elevated p-1.5 text-muted">{icon}</span> : null}
      </div>
      <p className={cn('mt-3 text-2xl font-semibold tabular-nums text-ink', tone)}>
        {value}
        {suffix ? <span className="ml-0.5 text-sm font-normal text-muted">{suffix}</span> : null}
      </p>
    </div>
  )
}
