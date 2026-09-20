import { useMemo } from 'react'
import type { Priority, Task } from '../../../lib/types'
import type { ChartPalette } from '../../../lib/chartTheme'
import { buildScoreBoardData, GROUP_ORDER_FACTOR, TASK_ORDER_FACTOR } from '../../../lib/mindmap'
import { taskColor } from '../../../lib/taskColor'

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
 * 横条长度表示分数占比，颜色与任务卡片一致（自定义色优先，否则优先级色）。
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
        taskColor(task, priorities, isDark),
      ),
    [tasks, priorities, isDark],
  )

  const maxScore = items.length ? items[0].score : 0

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
      <ol className="space-y-1">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpenTask(item.id)}
              title={`分数 ${item.score}（分组顺序 ${item.groupOrder} × ${GROUP_ORDER_FACTOR} + 组内顺序 ${item.taskOrder} × ${TASK_ORDER_FACTOR} + 优先级权重 ${item.priorityLevel}）`}
              className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-elevated"
            >
              <span
                className="w-6 shrink-0 text-right text-[10px] tabular-nums"
                style={{ color: palette.muted }}
              >
                {index + 1}
              </span>
              <span
                className="w-40 shrink-0 truncate text-xs"
                style={{ color: palette.text }}
              >
                {item.title}
              </span>
              <span className="relative h-4 flex-1 overflow-hidden rounded-sm">
                <span
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    width: `${maxScore ? Math.max(2, (item.score / maxScore) * 100) : 0}%`,
                    backgroundColor: item.color,
                  }}
                />
              </span>
              <span
                className="w-10 shrink-0 text-right text-[10px] tabular-nums"
                style={{ color: palette.subText }}
              >
                {item.score}
              </span>
              <span
                className="hidden w-24 shrink-0 truncate text-[10px] sm:block"
                style={{ color: palette.muted }}
              >
                {item.groupName}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
