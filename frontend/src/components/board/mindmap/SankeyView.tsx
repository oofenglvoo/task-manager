import { useMemo } from 'react'
import type { DefaultLabelFormatterCallbackParams } from 'echarts'
import type { Status, Task } from '../../../lib/types'
import type { EChartsOption } from '../../../lib/echarts'
import { chartPalette, chartTooltipStyle, withAlpha } from '../../../lib/chartTheme'
import { buildSankeyData, formatTaskTooltip } from '../../../lib/mindmap'
import { usePreferences } from '../../../store/preferences'
import { MindMapChart } from './MindMapChart'

interface SankeyViewProps {
  tasks: Task[]
  statuses: Status[]
  height: number
  groupBy: boolean
  onOpenTask: (taskId: number) => void
}

interface SankeyNodeShape {
  display?: string
  taskId?: number
}

function nodeOf(data: DefaultLabelFormatterCallbackParams['data']): SankeyNodeShape {
  if (data && typeof data === 'object') return data as SankeyNodeShape
  return {}
}

export function SankeyView({ tasks, statuses, height, groupBy, onOpenTask }: SankeyViewProps) {
  const { resolvedTheme } = usePreferences()
  const isDark = resolvedTheme === 'dark'
  const palette = useMemo(() => chartPalette(isDark), [isDark])
  const tooltipStyle = useMemo(() => chartTooltipStyle(isDark), [isDark])

  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  )
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const data = useMemo(
    () => buildSankeyData(tasks, statuses, palette, groupBy),
    [tasks, statuses, palette, groupBy],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        ...tooltipStyle,
        formatter: (params: unknown) => {
          const p = params as {
            dataType?: string
            data?: { display?: string; value?: number; source?: string; target?: string; taskId?: number }
          }
          if (p.dataType === 'edge') {
            return `<div style="font-weight:600">任务数：${p.data?.value ?? 0}</div>`
          }
          const taskId = p.data?.taskId
          if (typeof taskId === 'number') {
            const task = taskMap.get(taskId)
            if (task) {
              return formatTaskTooltip({
                task,
                status: task.status_id != null ? statusMap.get(task.status_id) : undefined,
              })
            }
          }
          return `<div style="font-weight:600">${p.data?.display ?? ''}</div>`
        },
      },
      series: [
        {
          type: 'sankey',
          left: 10,
          right: 96,
          top: 14,
          bottom: 14,
          nodeWidth: 15,
          nodeGap: 12,
          draggable: false,
          emphasis: { focus: 'adjacency' },
          label: {
            color: palette.text,
            fontSize: 11,
            fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
            formatter: (params: DefaultLabelFormatterCallbackParams) =>
              nodeOf(params.data).display ?? '',
          },
          lineStyle: { curveness: 0.5 },
          data: data.nodes,
          links: data.links.map((link) => ({
            ...link,
            lineStyle: {
              ...link.lineStyle,
              color: link.lineStyle?.color
                ? withAlpha(link.lineStyle.color, link.lineStyle.opacity ?? 0.4)
                : undefined,
            },
          })),
        },
      ],
    }),
    [data, palette, taskMap, statusMap, tooltipStyle],
  )

  return (
    <MindMapChart option={option} height={height} onTaskClick={onOpenTask} ariaLabel="任务桑基流带图" />
  )
}
