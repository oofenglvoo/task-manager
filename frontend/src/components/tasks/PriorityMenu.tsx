import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { PRIORITY_META, priorityLabel } from '../../lib/utils'

const PRIORITIES = [3, 2, 1]

export function PriorityMenu({
  priority,
  onChange,
}: {
  priority: number
  onChange: (priority: number) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = PRIORITY_META[priority] ?? PRIORITY_META[2]

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
        aria-label={`优先级：${priorityLabel(priority)}`}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:bg-elevated ${meta.text}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.bg}`} />
        {meta.label}
      </button>

      {open ? (
        <div className="absolute left-0 z-30 mt-1 w-24 overflow-hidden rounded-md border border-line bg-elevated py-1 shadow-panel">
          {PRIORITIES.map((level) => {
            const item = PRIORITY_META[level]
            return (
              <button
                key={level}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onChange(level)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-ink-soft transition-colors hover:bg-surface hover:text-ink"
              >
                <span className={`h-2 w-2 rounded-full ${item.bg}`} />
                <span className="flex-1">{item.label}</span>
                {priority === level ? <Check className="h-3 w-3" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
