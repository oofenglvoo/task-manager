import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /**
   * 面板级样式：作用到抽屉面板。用于让整个抽屉（含顶部/底部栏）
   * 复用卡片的便签底色（`.note-surface-*` 在 CSS 中位于 `.bg-surface` 之后，
   * 同权重下会盖掉面板的 `bg-surface`）。
   * 注意：内层区域不要再挂 `bg-surface`，否则会遮挡面板底色。
   */
  panelClassName?: string
  panelStyle?: CSSProperties
}

export function Drawer({ open, onClose, children, panelClassName, panelStyle }: DrawerProps) {
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
          className={cn(
            'flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-lg',
            panelClassName,
          )}
          style={panelStyle}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
  )
}
