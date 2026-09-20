import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TaskQuery } from '../../lib/types'
import {
  buildMonthGrid,
  buildWeekGrid,
  groupTasksByDay,
  dayProgress,
  holidayType,
  mergeHolidays,
} from '../../lib/calendar'
import type { CalendarViewMode } from '../../lib/calendar'
import { lunarInfo } from '../../lib/lunar'
import { useHolidays, useTasks } from '../../hooks/queries'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { LoadingBlock } from '../ui/Spinner'
import { DayCellContent } from './DayCellContent'
import { DayTasksPanel } from './DayTasksPanel'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function CalendarView() {
  const { search, priority, tagId, openTask, openCreate } = useUI()
  const [view, setView] = useState<CalendarViewMode>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)

  const query = useMemo<TaskQuery>(
    () => ({
      priority: priority ?? undefined,
      tag_id: tagId ?? undefined,
      q: search || undefined,
      archived: false,
      sort: 'due_date',
      order: 'asc',
    }),
    [priority, tagId, search],
  )

  const { data: tasks = [], isLoading } = useTasks(query)

  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1
  // holiday-cn 的 12 月可能由次年文件决定，故同时取次年。
  const { data: holidaysThis } = useHolidays(year)
  const { data: holidaysNext } = useHolidays(year + 1)
  const holidayLookup = useMemo(
    () => mergeHolidays([holidaysThis, holidaysNext]),
    [holidaysThis, holidaysNext],
  )

  const tasksByDay = useMemo(() => groupTasksByDay(tasks), [tasks])

  const cells = useMemo(
    () =>
      view === 'month'
        ? buildMonthGrid(year, month)
        : buildWeekGrid(cursor),
    [view, year, month, cursor],
  )

  const title =
    view === 'month'
      ? `${year} 年 ${month} 月`
      : (() => {
          const first = cells[0]
          const last = cells[cells.length - 1]
          if (!first || !last) return ''
          return `${first.month} 月 ${first.day} 日 – ${last.month} 月 ${last.day} 日`
        })()

  function shift(delta: number) {
    setCursor((prev) => {
      if (view === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      }
      return new Date(
        prev.getFullYear(),
        prev.getMonth(),
        prev.getDate() + delta * 7,
      )
    })
  }

  function goToday() {
    setCursor(new Date())
  }

  const selectedTasks = selected ? (tasksByDay.get(selected) ?? []) : []

  function selectedLabel(key: string): string {
    const [y, m, d] = key.split('-').map(Number)
    return `${y} 年 ${m} 月 ${d} 日`
  }

  return (
    <div className="scrollbar-thin flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2.5">
        <CalendarDays className="h-4 w-4 text-ink-soft" />
        <span className="text-sm font-semibold text-ink">{title}</span>
        <div className="ml-1 flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="上一页" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={goToday}>
            回到今天
          </Button>
          <Button size="icon" variant="ghost" aria-label="下一页" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto inline-flex rounded-md border border-line bg-surface p-0.5">
          {(['month', 'week'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'rounded px-3 py-1 text-xs transition-colors',
                view === mode
                  ? 'bg-accent text-white'
                  : 'text-ink-soft hover:bg-elevated hover:text-ink',
              )}
            >
              {mode === 'month' ? '月视图' : '周视图'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-6">
          <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] text-muted">
            {WEEKDAYS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const dayTasks = tasksByDay.get(cell.key) ?? []
              const progress = dayProgress(dayTasks)
              const holiday = holidayType(holidayLookup, cell.key)
              const lunar = lunarInfo(cell.year, cell.month, cell.day)
              const isWeekend = [6, 0].includes(new Date(cell.year, cell.month - 1, cell.day).getDay())
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelected(cell.key)}
                  className={cn(
                    'flex min-h-[104px] flex-col rounded-lg border p-2 text-left transition-colors',
                    view === 'week' ? 'min-h-[240px]' : '',
                    cell.inCurrentMonth
                      ? 'border-line bg-surface'
                      : 'border-line/40 bg-surface/40 opacity-60',
                    isWeekend && cell.inCurrentMonth && 'bg-elevated/40',
                    'hover:border-line-strong hover:bg-elevated',
                  )}
                >
                  <div className="flex-1">
                    <DayCellContent
                      day={cell.day}
                      lunar={lunar}
                      progress={progress}
                      holiday={holiday}
                      tasks={dayTasks}
                    />
                  </div>
                  {cell.isToday && cell.inCurrentMonth ? (
                    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-white">
                      今天
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-success" />全部完成
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning" />进行中
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-danger" />含逾期
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent" />待开始
            </span>
            <span className="ml-auto">周一为一周起始</span>
          </div>
        </div>
      )}

      <DayTasksPanel
        open={selected != null}
        dateLabel={selected ? selectedLabel(selected) : ''}
        tasks={selectedTasks}
        onClose={() => setSelected(null)}
        onOpenTask={(id) => {
          setSelected(null)
          openTask(id)
        }}
        onCreate={() => {
          const dueDate = selected ? `${selected}T23:59` : null
          setSelected(null)
          openCreate(null, dueDate)
        }}
      />
    </div>
  )
}
