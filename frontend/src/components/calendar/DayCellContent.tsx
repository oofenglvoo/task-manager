import type { Task } from '../../lib/types'
import type { DayProgress, HolidayType } from '../../lib/calendar'
import { cn } from '../../lib/utils'
import type { LunarInfo } from '../../lib/lunar'

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
}

/**
 * 单个日期格子的内容：公历日 + 农历/节气/节日 + 休/班角标 + 任务进度。
 */
export function DayCellContent({
  day,
  lunar,
  progress,
  holiday,
  tasks,
}: DayCellContentProps) {
  const subtitle = lunar.jieQi || lunar.festival || (day === 1 ? `${lunar.month}月` : lunar.day)

  return (
    <div className="flex h-full flex-col gap-1">
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold tabular-nums text-ink">{day}</span>
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

      <div className="mt-auto">
        {progress.total > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', PROGRESS_BAR[progress.state])} />
              <span className="text-[10px] tabular-nums text-ink-soft">
                {progress.done}/{progress.total}
              </span>
            </div>
            {tasks.length > 0 ? (
              <ul className="space-y-0.5">
                {tasks.slice(0, 2).map((task) => (
                  <li
                    key={task.id}
                    className={cn(
                      'truncate text-[10px] leading-tight',
                      task.completed_at != null
                        ? 'text-muted line-through'
                        : 'text-ink-soft',
                    )}
                    title={task.title}
                  >
                    {task.title}
                  </li>
                ))}
                {tasks.length > 2 ? (
                  <li className="text-[10px] text-muted">还有 {tasks.length - 2} 个…</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
