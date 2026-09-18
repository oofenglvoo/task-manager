import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Flame,
  Layers,
  ListChecks,
  Percent,
} from 'lucide-react'
import { useStats, useTasks } from '../../hooks/queries'
import { isToday, priorityLabel } from '../../lib/utils'
import { BarRow } from '../stats/BarRow'
import { StatCard } from '../stats/StatCard'

const PRIORITY_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#f59e0b',
  3: '#ef4444',
}

export function BoardSummary() {
  const { data: stats } = useStats()
  const { data: tasks = [] } = useTasks({ sort: 'position', order: 'asc' })

  const dueToday = tasks.filter(
    (task) => task.completed_at == null && isToday(task.due_date),
  ).length

  const total = stats?.active || 1

  return (
    <section className="space-y-4 border-b border-line px-4 py-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="总任务" value={stats?.total ?? 0} icon={<Layers className="h-4 w-4" />} />
        <StatCard
          label="进行中"
          value={stats?.active ?? 0}
          icon={<ListChecks className="h-4 w-4" />}
        />
        <StatCard
          label="已完成"
          value={stats?.completed ?? 0}
          tone="text-success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="完成率"
          value={stats?.completion_rate ?? 0}
          suffix="%"
          icon={<Percent className="h-4 w-4" />}
        />
        <StatCard
          label="已逾期"
          value={stats?.overdue ?? 0}
          tone={(stats?.overdue ?? 0) > 0 ? 'text-danger' : undefined}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="7 天内到期"
          value={stats?.due_soon ?? 0}
          tone={(stats?.due_soon ?? 0) > 0 ? 'text-warning' : undefined}
          icon={<CalendarClock className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-xs font-semibold text-ink">按状态分布</h2>
          {stats && stats.by_status.length > 0 ? (
            stats.by_status.map((item) => (
              <BarRow
                key={item.status_id ?? 'none'}
                label={item.name}
                count={item.count}
                total={total}
                color={item.color}
              />
            ))
          ) : (
            <p className="text-xs text-muted">暂无数据</p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-xs font-semibold text-ink">按优先级分布</h2>
          {stats ? (
            stats.by_priority.map((item) => (
              <BarRow
                key={item.priority}
                label={priorityLabel(item.priority)}
                count={item.count}
                total={total}
                color={PRIORITY_COLORS[item.priority] ?? '#94a3b8'}
              />
            ))
          ) : (
            <p className="text-xs text-muted">暂无数据</p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-xs font-semibold text-ink">今日提醒</h2>
          <div className="flex items-center gap-3">
            <span
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ' +
                (dueToday > 0
                  ? 'bg-warning/15 text-warning'
                  : 'bg-elevated text-muted')
              }
            >
              <Flame className="h-3.5 w-3.5" />
              今日到期 {dueToday}
            </span>
            <span
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ' +
                ((stats?.overdue ?? 0) > 0
                  ? 'bg-danger/15 text-danger'
                  : 'bg-elevated text-muted')
              }
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              已逾期 {stats?.overdue ?? 0}
            </span>
          </div>
          <p className="text-xs text-muted">
            {dueToday > 0 || (stats?.overdue ?? 0) > 0
              ? '优先处理今天到期与已逾期的任务。'
              : '今天没有到期或逾期的任务，保持节奏。'}
          </p>
        </div>
      </div>
    </section>
  )
}
