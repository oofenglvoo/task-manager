import { useMemo } from 'react'
import type { Priority, Status, Task } from '../../../lib/types'
import type { EChartsOption } from '../../../lib/echarts'
import type { ChartPalette } from '../../../lib/chartTheme'
import { chartTooltipStyle } from '../../../lib/chartTheme'
import { buildTreeData, formatTaskTooltip } from '../../../lib/mindmap'
import { usePreferences } from '../../../store/preferences'
import { MindMapChart } from './MindMapChart'

interface TreeViewProps {
  tasks: Task[]
  statuses: Status[]
  priorities: Priority[]
  palette: ChartPalette
  height: number
  groupBy: boolean
  onOpenTask: (taskId: number) => void
}

function taskIdFromNodeId(id: string): number | null {
  const match = /^task-(\d+)$/.exec(id)
  return match ? Number(match[1]) : null
}

export function TreeView({
  tasks,
  statuses,
  priorities,
  palette,
  height,
  groupBy,
  onOpenTask,
}: TreeViewProps) {
  const { resolvedTheme } = usePreferences()
  const isDark = resolvedTheme === 'dark'
  const tooltipStyle = useMemo(() => chartTooltipStyle(isDark), [isDark])

  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  )
  const priorityNames = useMemo(
    () => new Map(priorities.map((item) => [item.id, item.name])),
    [priorities],
  )
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const data = useMemo(
    () => buildTreeData(tasks, statuses, priorities, palette, groupBy),
    [tasks, statuses, priorities, palette, groupBy],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        confine: true,
        ...tooltipStyle,
        formatter: (params: unknown) => {
          const p = params as { data?: { id?: string; name?: string } }
          const taskId = p.data?.id ? taskIdFromNodeId(p.data.id) : null
          if (taskId != null) {
            const task = taskMap.get(taskId)
            if (task) {
              return formatTaskTooltip({
                task,
                status: task.status_id != null ? statusMap.get(task.status_id) : undefined,
                priorityName: priorityNames.get(task.priority),
              })
            }
          }
          return `<div style="font-weight:600">${p.data?.name ?? ''}</div>`
        },
      },
      series: [
        {
          type: 'tree',
          orient: 'LR',
          left: 16,
          right: 240,
          top: 16,
          bottom: 16,
          symbol: 'circle',
          symbolSize: 8,
          expandAndCollapse: false,
          initialTreeDepth: -1,
          roam: true,
          initialZoom: 1,
          lineStyle: { color: palette.lineStrong, width: 1.3, curveness: 0.5 },
          itemStyle: { borderWidth: 0 },
          label: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            color: palette.text,
            fontSize: 11,
            fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
            overflow: 'break',
            width: 200,
            lineHeight: 14,
          },
          leaves: {
            label: {
              position: 'right',
              align: 'left',
              color: palette.subText,
              overflow: 'break',
              width: 220,
              lineHeight: 14,
            },
          },
          emphasis: {
            focus: 'descendant',
            label: { fontSize: 12 },
          },
          data: [data],
        },
      ],
    }),
    [data, palette, taskMap, statusMap, tooltipStyle, priorityNames],
  )

  return (
    <MindMapChart option={option} height={height} onTaskClick={onOpenTask} ariaLabel="任务四列树状图" />
  )
}
