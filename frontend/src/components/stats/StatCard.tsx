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
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold text-ink', tone)}>
        {value}
        {suffix ? <span className="ml-0.5 text-sm font-normal text-muted">{suffix}</span> : null}
      </p>
    </div>
  )
}
