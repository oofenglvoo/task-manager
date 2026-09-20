import type { HolidayCalendar, HolidayDay, Task } from './types'
import { parseDue } from './utils'

export type CalendarViewMode = 'month' | 'week'

export interface DayCell {
  /** 本地日期 key，格式 YYYY-MM-DD。 */
  key: string
  year: number
  month: number
  day: number
  /** 是否属于当前展示的月份。 */
  inCurrentMonth: boolean
  isToday: boolean
}

export type DayProgressState = 'none' | 'done' | 'partial' | 'overdue' | 'open'

export interface DayProgress {
  total: number
  done: number
  /** 未完成且已逾期。 */
  overdue: number
  state: DayProgressState
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function taskDayKey(task: Task): string | null {
  const due = parseDue(task.due_date)
  if (!due) return null
  return dateKey(due.getFullYear(), due.getMonth() + 1, due.getDate())
}

function todayKey(): string {
  const now = new Date()
  return dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/**
 * 生成月视图网格（周一开头，补齐前后使其为整周）。
 */
export function buildMonthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month - 1, 1)
  // getDay(): 0=周日；转换为以周一为 0 的偏移。
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month - 1, 1 - offset)
  const today = todayKey()
  const cells: DayCell[] = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    )
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    const d = date.getDate()
    const key = dateKey(y, m, d)
    cells.push({
      key,
      year: y,
      month: m,
      day: d,
      inCurrentMonth: y === year && m === month,
      isToday: key === today,
    })
  }
  return cells
}

/**
 * 生成周视图的一周（7 天，周一开头）。
 */
export function buildWeekGrid(anchor: Date): DayCell[] {
  const offset = (anchor.getDay() + 6) % 7
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() - offset,
  )
  const today = todayKey()
  const cells: DayCell[] = []
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    )
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    const d = date.getDate()
    const key = dateKey(y, m, d)
    cells.push({
      key,
      year: y,
      month: m,
      day: d,
      inCurrentMonth: true,
      isToday: key === today,
    })
  }
  return cells
}

/** 按截止日期把任务归组到 YYYY-MM-DD。 */
export function groupTasksByDay(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.is_archived) continue
    const key = taskDayKey(task)
    if (!key) continue
    const list = map.get(key)
    if (list) list.push(task)
    else map.set(key, [task])
  }
  return map
}

/**
 * 单日进度：完成度着色依据。
 * 全完成 -> done；含逾期未完成 -> overdue；其余未完成 -> partial/open。
 */
export function dayProgress(tasks: Task[]): DayProgress {
  const total = tasks.length
  if (total === 0) return { total: 0, done: 0, overdue: 0, state: 'none' }
  const now = Date.now()
  let done = 0
  let overdue = 0
  for (const task of tasks) {
    if (task.completed_at != null) {
      done += 1
      continue
    }
    const due = parseDue(task.due_date)
    if (due && due.getTime() < now) overdue += 1
  }
  let state: DayProgressState
  if (done === total) state = 'done'
  else if (overdue > 0) state = 'overdue'
  else if (done > 0) state = 'partial'
  else state = 'open'
  return { total, done, overdue, state }
}

export type HolidayType = 'off' | 'work'

export interface HolidayLookup {
  off: Map<string, string>
  work: Map<string, string>
}

/** 合并多年节假日数据，区分放假（休）与调休补班（班）。 */
export function mergeHolidays(calendars: Array<HolidayCalendar | undefined>): HolidayLookup {
  const off = new Map<string, string>()
  const work = new Map<string, string>()
  for (const calendar of calendars) {
    if (!calendar) continue
    for (const day of calendar.days) {
      applyHoliday(day, off, work)
    }
  }
  return { off, work }
}

function applyHoliday(
  day: HolidayDay,
  off: Map<string, string>,
  work: Map<string, string>,
): void {
  if (day.is_off_day) off.set(day.date, day.name)
  else work.set(day.date, day.name)
}

export function holidayType(
  lookup: HolidayLookup,
  key: string,
): { type: HolidayType; name: string } | null {
  const offName = lookup.off.get(key)
  if (offName != null) return { type: 'off', name: offName }
  const workName = lookup.work.get(key)
  if (workName != null) return { type: 'work', name: workName }
  return null
}
