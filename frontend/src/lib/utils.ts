export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface PriorityMeta {
  label: string
  color: string
  text: string
  bg: string
}

export const PRIORITY_META: Record<number, PriorityMeta> = {
  1: { label: '低', color: '#6b7280', text: 'text-priority-low', bg: 'bg-priority-low' },
  2: { label: '中', color: '#f59e0b', text: 'text-priority-medium', bg: 'bg-priority-medium' },
  3: { label: '高', color: '#ef4444', text: 'text-priority-high', bg: 'bg-priority-high' },
}

export function priorityLabel(priority: number): string {
  return PRIORITY_META[priority]?.label ?? '中'
}

export function todayISO(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export type DueState = 'overdue' | 'today' | 'soon' | 'normal' | 'none'

export function dueState(dueDate: string | null, isDone: boolean): DueState {
  if (!dueDate) return 'none'
  if (isDone) return 'normal'
  const today = todayISO()
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 3)
  const soonISO = new Date(
    soonDate.getTime() - soonDate.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10)
  if (dueDate <= soonISO) return 'soon'
  return 'normal'
}

export function dueLabel(dueDate: string | null, isDone: boolean): string {
  const state = dueState(dueDate, isDone)
  if (state === 'overdue') return '已逾期'
  if (state === 'today') return '今天到期'
  if (state === 'soon') return '即将到期'
  return formatDate(dueDate)
}

export function dueClass(dueDate: string | null, isDone: boolean): string {
  const state = dueState(dueDate, isDone)
  if (state === 'overdue') return 'text-danger'
  if (state === 'today') return 'text-warning'
  if (state === 'soon') return 'text-warning/80'
  return 'text-ink-soft'
}
