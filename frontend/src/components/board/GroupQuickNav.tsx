import { cn } from '../../lib/utils'

export interface GroupQuickNavItem {
  key: string
  name: string
  color: string | null
  count: number
}

interface GroupQuickNavProps {
  items: GroupQuickNavItem[]
  onJump: (key: string) => void
  sticky?: boolean
}

export function GroupQuickNav({ items, onJump, sticky = false }: GroupQuickNavProps) {
  if (!items.length) return null

  return (
    <nav
      aria-label="分组快速定位"
      className={cn(
        'scrollbar-thin z-20 flex gap-1.5 overflow-x-auto rounded-lg border border-line bg-surface/95 p-1.5 shadow-sm backdrop-blur',
        sticky ? 'sticky top-0 mb-3' : 'mb-2',
      )}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          title={`定位到${item.name}`}
          onClick={() => onJump(item.key)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-ink-soft transition-colors hover:border-line hover:bg-elevated hover:text-ink"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color ?? 'rgb(var(--c-line-strong))' }}
          />
          <span className="max-w-40 truncate">{item.name}</span>
          <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
            {item.count}
          </span>
        </button>
      ))}
    </nav>
  )
}
