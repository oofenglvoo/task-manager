import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import type { Tag } from '../../lib/types'

export function Badge({
  color,
  children,
  className,
}: {
  color?: string
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
        className,
      )}
      style={
        color
          ? { borderColor: `${color}55`, color, backgroundColor: `${color}1a` }
          : undefined
      }
    >
      {children}
    </span>
  )
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}

export function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
      style={{ color: tag.color, backgroundColor: `${tag.color}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      ) : null}
    </span>
  )
}
