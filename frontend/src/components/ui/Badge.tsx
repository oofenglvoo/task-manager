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
          ? { borderColor: `${color}99`, color, backgroundColor: `${color}26` }
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

export function TagChip({
  tag,
  onRemove,
  variant = 'solid',
}: {
  tag: Tag
  onRemove?: () => void
  variant?: 'solid' | 'subtle' | 'compact'
}) {
  const solid = variant === 'solid'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        variant === 'compact' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
        !solid && 'border',
      )}
      style={
        solid
          ? { color: tag.color, backgroundColor: `${tag.color}26` }
          : { color: tag.color, borderColor: `${tag.color}44`, backgroundColor: 'transparent' }
      }
    >
      <span
        className={cn(
          'rounded-full',
          variant === 'compact' ? 'h-1 w-1' : 'h-1.5 w-1.5',
        )}
        style={{ backgroundColor: tag.color }}
      />
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
