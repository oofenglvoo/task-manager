import type { Task } from '../../lib/types'
import type { DayProgress, HolidayType } from '../../lib/calendar'
import { cn, dueState } from '../../lib/utils'
import type { LunarInfo } from '../../lib/lunar'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { usePreferences } from '../../store/preferences'
import { taskColor } from '../../lib/taskColor'

const PROGRESS_BAR: Record<DayProgress['state'], string> = {
  none: 'bg-muted/30',
  done: 'bg-success',
  partial: 'bg-warning',
  overdue: 'bg-danger',
  open: 'bg-accent',
}

interface DayCellContentProps {
  day: number
  lunar: LunarInfo
  progress: DayProgress
  holiday: { type: HolidayType; name: string } | null
  tasks: Task[]
  isToday: boolean
  maxTasks: number
}

/**
 * 单个日期格子的内容：公历日 + 农历/节气/节日 + 休/班角标 + 任务进度。
 * 任务条用便签色/优先级色标识，逾期任务加彩色左边条。
 */
export function DayCellContent({
  day,
  lunar,
  progress,
  holiday,
  tasks,
  isToday,
  maxTasks,
}: DayCellContentProps) {
  const { priorities } = usePrioritiesMeta()
  const { resolvedTheme } = usePreferences()
  const isDark = resolvedTheme === 'dark'

  const subtitle = lunar.jieQi || lunar.festival || (day === 1 ? `${lunar.month}月` : lunar.day)
  const shown = tasks.slice(0, maxTasks)

  return (
    <div className="flex h-full flex-col gap-1">
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            isToday
              ? 'inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 text-white'
              : 'text-ink',
          )}
        >
          {day}
        </span>
        {holiday ? (
          <span
            className={cn(
              'shrink-0 rounded px-1 text-[10px] font-medium leading-4',
              holiday.type === 'off'
                ? 'bg-success/20 text-success'
                : 'bg-danger/20 text-danger',
            )}
            title={holiday.name}
          >
            {holiday.type === 'off' ? '休' : '班'}
          </span>
        ) : null}
      </div>

      <span
        className={cn(
          'truncate text-[11px] leading-none',
          lunar.jieQi || holiday ? 'text-accent' : 'text-muted',
        )}
      >
        {subtitle}
      </span>

      <div className="mt-auto space-y-1">
        {progress.total > 0 ? (
          <>
            <div className="flex items-center gap-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', PROGRESS_BAR[progress.state])} />
              <span className="text-[10px] tabular-nums text-ink-soft">
                {progress.done}/{progress.total}
              </span>
            </div>
            <ul className="space-y-0.5">
              {shown.map((task) => {
                const isDone = task.completed_at != null
                const overdue = dueState(task.due_date, isDone) === 'overdue'
                const tint = taskColor(task, priorities, isDark)
                return (
                  <li
                    key={task.id}
                    className={cn(
                      'flex items-center gap-1 truncate rounded border-l-2 py-0.5 pl-1 pr-0.5 text-[10px] leading-tight',
                      isDone ? 'text-muted line-through' : 'text-ink-soft',
                    )}
                    style={{
                      borderLeftColor: overdue ? 'rgb(var(--c-danger))' : tint,
                      backgroundColor: isDone
                        ? 'transparent'
                        : `color-mix(in srgb, ${tint} calc(var(--app-card-alpha) * 22%), transparent)`,
                    }}
                    title={task.title}
                  >
                    <span className="truncate">{task.title}</span>
                  </li>
                )
              })}
              {tasks.length > maxTasks ? (
                <li className="text-[10px] text-muted">还有 {tasks.length - maxTasks} 个…</li>
              ) : null}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  )
}
