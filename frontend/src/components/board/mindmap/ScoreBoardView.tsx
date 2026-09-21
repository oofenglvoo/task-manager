import { useMemo } from 'react'
import type { Priority, Task } from '../../../lib/types'
import type { ChartPalette } from '../../../lib/chartTheme'
import { buildScoreBoardData } from '../../../lib/mindmap'
import { cardSurfaceStyle } from '../../../lib/priority'

interface ScoreBoardViewProps {
  tasks: Task[]
  priorities: Priority[]
  palette: ChartPalette
  height: number
  isDark: boolean
  onOpenTask: (taskId: number) => void
}

/**
 * 评分柱状图：按「分组顺序 > 组内顺序 > 优先级等级」加权求和，
 * 横条长度表示分数占比，颜色复用任务卡片的取色规则（便签三档底色 / 自定义色）。
 */
export function ScoreBoardView({
  tasks,
  priorities,
  palette,
  height,
  isDark,
  onOpenTask,
}: ScoreBoardViewProps) {
  const items = useMemo(
    () =>
      buildScoreBoardData(tasks, priorities, (task) =>
        cardSurfaceStyle(task, priorities, task.completed_at != null, isDark),
      ),
    [tasks, priorities, isDark],
  )

  const maxScore = items.length ? items[0].score : 0
  // 基准取最高分的 1.25 倍：最长柱约占容器 80%，右侧留白，不顶到端点。
  const scaleBase = maxScore * 1.25

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-xs text-muted">没有可评分的任务</p>
    )
  }

  return (
    <div
      className="scrollbar-thin overflow-y-auto pr-1"
      style={{ maxHeight: height }}
    >
       <ol className="space-y-1.5">
         {items.map((item, index) => (
           <li key={item.id}>
             <button
              type="button"
              onClick={() => onOpenTask(item.id)}
               title={`分数 ${item.score}（分组权重（越靠前越高） ${item.groupOrder} · 组内权重 ${item.taskOrder} · 优先级 ${item.priorityLevel}）`}
               className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-elevated"
             >
               <span
                 className="w-6 shrink-0 text-right text-[10px] font-medium tabular-nums"
                 style={{ color: palette.muted }}
               >
                 {index + 1}
               </span>
                <span className="relative flex h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-elevated/50">
                  <span
                    className={`absolute inset-y-0 left-0 flex min-w-[22%] items-center gap-2 rounded-md px-2 transition-[width] duration-300 group-hover:brightness-110 ${item.surfaceClass}`}
                    style={{
                      width: `${scaleBase ? Math.max(22, (item.score / scaleBase) * 100) : 0}%`,
                      ...item.surfaceStyle,
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                      {item.score}
                    </span>
                  </span>
                </span>
             </button>
           </li>
        ))}
      </ol>
    </div>
  )
}
