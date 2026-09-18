import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { Status } from '../../lib/types'

interface StatusMenuProps {
  status?: Status
  statuses: Status[]
  onChange: (statusId: number | null) => void
}

export function StatusMenu({ status, statuses, onChange }: StatusMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  const color = status?.color ?? '#94a3b8'
  const label = status?.name ?? '未分配'

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors hover:brightness-110"
        style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1f` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-md border border-line bg-elevated py-1 shadow-panel">
          {statuses.map((item) => (
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
              <span className="flex-1">{item.name}</span>
              {status?.id === item.id ? <Check className="h-3 w-3" /> : null}
            </button>
          ))}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onChange(null)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 border-t border-line px-2.5 py-1.5 text-left text-xs text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <span className="h-2 w-2 rounded-full bg-[#94a3b8]" />
            <span className="flex-1">未分配</span>
            {!status ? <Check className="h-3 w-3" /> : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}
