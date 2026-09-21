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
  /**
   * 让内容自身滚动：弹窗限制在视口内，中间区域用 flex-1 + overflow-y-auto。
   * 用于内容可能很长的场景（如任务只读预览），避免整页滚动或内容被裁掉。
   */
  scrollable?: boolean
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
  scrollable = false,
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
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          'w-full rounded-xl border border-line bg-surface shadow-lg',
          width,
          scrollable && 'flex max-h-[78vh] flex-col overflow-hidden',
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="rounded border border-transparent p-1 text-muted transition-colors hover:bg-elevated hover:text-ink hover:border-line"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div
          className={cn(
            scrollable ? 'scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4' : 'px-5 py-4',
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
