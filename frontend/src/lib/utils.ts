export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
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

/**
 * 解析截止时间。带时分的值按本地时间精确解析；纯日期（旧数据）视为当天 23:59，
 * 与后端保持一致，避免旧数据在升级后集体变为逾期。
 */
export function parseDue(value: string | null | undefined): Date | null {
  if (!value) return null
  const text = value.trim()
  if (!text) return null
  if (text.length <= 10) {
    const date = new Date(`${text}T23:59:00`)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 截止时间的展示文本：带时分则显示到分，纯日期只显示日期。 */
export function formatDue(value: string | null | undefined): string {
  if (!value) return ''
  const text = value.trim()
  if (text.length <= 10) return formatDate(text)
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dueState(dueDate: string | null, isDone: boolean): DueState {
  if (!dueDate) return 'none'
  if (isDone) return 'normal'
  const due = parseDue(dueDate)
  if (!due) return 'none'
  const now = new Date()
  if (due.getTime() < now.getTime()) return 'overdue'
  if (sameDay(due, now)) return 'today'
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  if (due.getTime() <= soon.getTime()) return 'soon'
  return 'normal'
}

export function dueLabel(dueDate: string | null, isDone: boolean): string {
  const state = dueState(dueDate, isDone)
  if (state === 'overdue') return '已逾期'
  if (state === 'today') return '今天到期'
  if (state === 'soon') return '即将到期'
  return formatDue(dueDate)
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
  if (state === 'overdue') return 'bg-danger text-white'
  if (state === 'today') return 'bg-warning text-black'
  return ''
}

export function noteTilt(id: number): number {
  const angles = [-1.6, 1.1, -0.7, 1.8, -1.2, 0.6]
  return angles[Math.abs(id) % angles.length]
}

export function isToday(value: string | null | undefined): boolean {
  if (!value) return false
  return value.slice(0, 10) === todayISO()
}
