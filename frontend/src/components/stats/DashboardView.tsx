import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  Percent,
  Layers,
} from 'lucide-react'
import { useStats } from '../../hooks/queries'
import { priorityLabel } from '../../lib/utils'
import { LoadingBlock } from '../ui/Spinner'
import { BarRow } from './BarRow'
import { StatCard } from './StatCard'

const PRIORITY_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#f59e0b',
  3: '#ef4444',
}

export function DashboardView() {
  const { data: stats, isLoading } = useStats()

  if (isLoading || !stats) return <LoadingBlock />

  const total = stats.active || 1

  return (
    <div className="scrollbar-thin h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-ink">统计仪表盘</h1>
            <p className="text-xs text-muted">全部任务概览</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="总任务" value={stats.total} icon={<Layers className="h-4 w-4" />} />
          <StatCard
            label="进行中"
            value={stats.active}
            icon={<ListChecks className="h-4 w-4" />}
          />
          <StatCard
            label="已完成"
            value={stats.completed}
            tone="text-success"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatCard
            label="完成率"
            value={stats.completion_rate}
            suffix="%"
            icon={<Percent className="h-4 w-4" />}
          />
          <StatCard
            label="已逾期"
            value={stats.overdue}
            tone={stats.overdue > 0 ? 'text-danger' : undefined}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            label="7 天内到期"
            value={stats.due_soon}
            tone={stats.due_soon > 0 ? 'text-warning' : undefined}
            icon={<CalendarClock className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">按状态分布</h2>
            <div className="space-y-3">
              {stats.by_status.map((item) => (
                <BarRow
                  key={item.status_id ?? 'none'}
                  label={item.name}
                  count={item.count}
                  total={total}
                  color={item.color}
                />
              ))}
              {stats.by_status.length === 0 ? (
                <p className="text-xs text-muted">暂无数据</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">按优先级分布</h2>
            <div className="space-y-3">
              {stats.by_priority.map((item) => (
                <BarRow
                  key={item.priority}
                  label={priorityLabel(item.priority)}
                  count={item.count}
                  total={total}
                  color={PRIORITY_COLORS[item.priority] ?? '#94a3b8'}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
