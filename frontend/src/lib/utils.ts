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

export function relativeTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return '刚刚'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days <= 7) return `${days} 天前`
  return formatDate(value)
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

export function dueBadgeClass(dueDate: string | null, isDone: boolean): string {
  const state = dueState(dueDate, isDone)
  if (state === 'overdue') return 'bg-danger/10 text-danger'
  if (state === 'today') return 'bg-warning/10 text-warning'
  return ''
}

export function noteSurfaceClass(priority: number, isDone: boolean): string {
  if (isDone) return 'bg-note-low/40'
  if (priority >= 3) return 'bg-note-high/70'
  if (priority === 2) return 'bg-note-medium/60'
  return 'bg-note-base'
}

export function noteTilt(id: number): number {
  const angles = [-1.6, 1.1, -0.7, 1.8, -1.2, 0.6]
  return angles[Math.abs(id) % angles.length]
}

export function isToday(value: string | null | undefined): boolean {
  if (!value) return false
  return value.slice(0, 10) === todayISO()
}
