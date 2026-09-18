import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[10vh]"
      onMouseDown={onClose}
    >
      <div
        className={cn('w-full rounded-lg border border-line bg-surface shadow-panel', width)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="px-4 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
