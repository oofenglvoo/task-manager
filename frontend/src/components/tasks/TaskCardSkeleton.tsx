import { cn } from '../../lib/utils'

export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-full animate-pulse rounded-lg border border-line/70 bg-surface p-4 shadow-sm',
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="h-3 w-10 rounded bg-line" />
        <div className="h-4 w-14 rounded-full bg-line" />
      </div>
      <div className="h-4 w-3/4 rounded bg-line" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3 w-full rounded bg-line/70" />
        <div className="h-3 w-5/6 rounded bg-line/70" />
      </div>
      <div className="mt-3 h-3 w-24 rounded bg-line/60" />
    </div>
  )
}
