import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToast } from '../../store/toast'
import { cn } from '../../lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={cn(
            'pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-panel transition-colors',
            toast.tone === 'error'
              ? 'border-danger/40 bg-danger/10 text-danger'
              : toast.tone === 'success'
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-line bg-elevated text-ink',
          )}
        >
          {toast.tone === 'error' ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : toast.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
        </button>
      ))}
    </div>
  )
}
