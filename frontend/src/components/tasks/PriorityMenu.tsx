import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { cn } from '../../lib/utils'

export function PriorityMenu({
  priority,
  onChange,
}: {
  priority: number
  onChange: (priority: number) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { sorted, byId } = usePrioritiesMeta()
  const current = byId(priority)
  const color = current?.color ?? '#6b7280'

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label={`优先级：${current?.name ?? priority}`}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="inline-flex items-center gap-1 rounded border border-line bg-surface px-1 py-0.5 text-xs text-ink-soft transition-colors hover:bg-elevated"
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {current?.name ?? `优先级 ${priority}`}
      </button>

      {open ? (
        <div className="absolute left-0 z-30 mt-1 w-28 overflow-hidden rounded-md border border-line bg-elevated py-1 shadow-lg">
          {sorted.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onChange(item.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-ink-soft transition-colors hover:bg-surface hover:text-ink"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className={cn('flex-1 truncate', priority === item.id && 'text-ink')}>
                {item.name}
              </span>
              {priority === item.id ? <Check className="h-3 w-3" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
