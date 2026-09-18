import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastState | null>(null)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = ++seq
    setToasts((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用')
  return ctx
}
