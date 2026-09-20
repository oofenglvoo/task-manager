import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Drawer({ open, onClose, children }: DrawerProps) {
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
        className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm"
        onMouseDown={onClose}
      >
        <div
          className="flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-lg"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
  )
}
