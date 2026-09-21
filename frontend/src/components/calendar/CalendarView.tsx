import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

// 滚轮翻页：累计滚动量达到阈值才翻一页，并加冷却时间，
// 避免触控板一次滑动连续翻好几页。
const WHEEL_THRESHOLD = 24
const WHEEL_COOLDOWN_MS = 220

export function CalendarView() {
  const { search, priority, tagId, openTask, openCreate } = useUI()
  const [view, setView] = useState<CalendarViewMode>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)

  const gridRef = useRef<HTMLDivElement | null>(null)
  const wheelAccum = useRef(0)
  const wheelLockUntil = useRef(0)

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

  const shift = useCallback(
    (delta: number) => {
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
    },
    [view],
  )

  function goToday() {
    setCursor(new Date())
  }

  // 只在日期网格区域内接管滚轮：向上滚 = 上一页，向下滚 = 下一页。
  // 必须用原生监听（passive: false）才能 preventDefault，阻止页面同时滚动。
  useEffect(() => {
    const node = gridRef.current
    if (!node) return

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      event.preventDefault()

      const now = Date.now()
      if (now < wheelLockUntil.current) return

      wheelAccum.current += event.deltaY
      if (Math.abs(wheelAccum.current) < WHEEL_THRESHOLD) return

      const direction = wheelAccum.current > 0 ? 1 : -1
      wheelAccum.current = 0
      wheelLockUntil.current = now + WHEEL_COOLDOWN_MS
      shift(direction)
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
    // 依赖 isLoading：日期网格要等加载完成才渲染，挂载时 ref 还是 null，
    // 不加这个依赖就永远不会补上监听。
  }, [shift, isLoading])

  const selectedTasks = selected ? (tasksByDay.get(selected) ?? []) : []

  function selectedLabel(key: string): string {
    const [y, m, d] = key.split('-').map(Number)
    return `${y} 年 ${m} 月 ${d} 日`
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-[1400px] shrink-0 px-4 pt-3">
        <div className="app-surface-panel flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-sm">
          <div className="flex items-center gap-2 pl-1">
            <CalendarDays className="h-4 w-4 text-accent" />
            <span className="text-base font-semibold text-ink">{title}</span>
          </div>

          <div className="flex items-center gap-1">
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

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[11px] text-muted sm:inline">
              滚轮翻页
            </span>
            <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
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
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col px-4 pb-3">
          <div ref={gridRef} className="scrollbar-thin flex min-h-0 flex-1 flex-col select-none overflow-y-auto pb-2">
            <div className="grid shrink-0 grid-cols-7 gap-1.5 pb-1.5 text-center text-xs font-medium text-muted">
              {WEEKDAYS.map((label, index) => (
                <span key={label} className={cn(index >= 5 && 'text-ink-soft')}>
                  {label}
                </span>
              ))}
            </div>
            <div
              className={cn(
                'grid min-h-0 flex-1 grid-cols-7 gap-1.5',
                view === 'week' ? 'grid-rows-1' : 'grid-rows-6',
              )}
            >
              {cells.map((cell) => {
                const dayTasks = tasksByDay.get(cell.key) ?? []
                const progress = dayProgress(dayTasks)
                const holiday = holidayType(holidayLookup, cell.key)
                const lunar = lunarInfo(cell.year, cell.month, cell.day)
                const isWeekend = [6, 0].includes(
                  new Date(cell.year, cell.month - 1, cell.day).getDay(),
                )
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelected(cell.key)}
                    className={cn(
                      'flex flex-col overflow-hidden rounded-xl border p-2 text-left transition-all',
                      view === 'week' ? 'min-h-[220px]' : 'min-h-[96px]',
                      cell.inCurrentMonth
                        ? 'border-line bg-surface hover:border-line-strong hover:shadow-sm'
                        : 'border-line/40 bg-surface/40 opacity-55 hover:opacity-80',
                      isWeekend && cell.inCurrentMonth && 'bg-elevated/50',
                      cell.isToday &&
                        cell.inCurrentMonth &&
                        'border-accent/60 ring-1 ring-accent/50',
                    )}
                  >
                    <DayCellContent
                      day={cell.day}
                      lunar={lunar}
                      progress={progress}
                      holiday={holiday}
                      tasks={dayTasks}
                      isToday={cell.isToday && cell.inCurrentMonth}
                      maxTasks={view === 'week' ? 5 : 2}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />全部完成
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warning" />进行中
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" />含逾期
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />待开始
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded bg-success/20 px-1 text-[10px] font-medium leading-4 text-success">
                休
              </span>
              放假
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded bg-danger/20 px-1 text-[10px] font-medium leading-4 text-danger">
                班
              </span>
              调休
            </span>
            <span className="ml-auto">周一为一周起始 · 滚轮翻页</span>
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
