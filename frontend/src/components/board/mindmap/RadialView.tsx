import { useMemo } from 'react'
import type { Status, Task } from '../../../lib/types'
import type { EChartsOption } from '../../../lib/echarts'
import { chartPalette, chartTooltipStyle } from '../../../lib/chartTheme'
import { buildSunburstData, formatTaskTooltip } from '../../../lib/mindmap'
import { usePreferences } from '../../../store/preferences'
import { MindMapChart } from './MindMapChart'

interface RadialViewProps {
  tasks: Task[]
  statuses: Status[]
  height: number
  onOpenTask: (taskId: number) => void
}

function taskIdFromNodeId(id: string): number | null {
  const match = /^task-(\d+)$/.exec(id)
  return match ? Number(match[1]) : null
}

export function RadialView({ tasks, statuses, height, onOpenTask }: RadialViewProps) {
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
    () => buildSunburstData(tasks, statuses, palette),
    [tasks, statuses, palette],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
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
              })
            }
          }
          return `<div style="font-weight:600">${p.data?.name ?? ''}</div>`
        },
      },
      series: [
        {
          type: 'sunburst',
          radius: [0, '95%'],
          center: ['50%', '50%'],
          sort: undefined,
          nodeClick: false,
          emphasis: { focus: 'ancestor' },
          itemStyle: { borderColor: palette.canvas, borderWidth: 1 },
          label: {
            color: palette.text,
            fontSize: 11,
            fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
            minAngle: 6,
            overflow: 'truncate',
          },
          labelLayout: { hideOverlap: true },
          levels: [
            {
              r0: '0%',
              r: '18%',
              label: {
                rotate: 0,
                fontSize: 12,
                fontWeight: 600,
                color: palette.text,
              },
            },
            {
              r0: '20%',
              r: '42%',
              label: { rotate: 'tangential', fontSize: 12, fontWeight: 600, minAngle: 12 },
            },
            {
              r0: '42%',
              r: '66%',
              label: { rotate: 'tangential', fontSize: 11, minAngle: 14 },
            },
            {
              r0: '66%',
              r: '95%',
              label: {
                rotate: 'tangential',
                fontSize: 10,
                minAngle: 16,
                color: palette.subText,
              },
            },
          ],
          data,
        },
      ],
    }),
    [data, palette, taskMap, statusMap, tooltipStyle],
  )

  return (
    <MindMapChart option={option} height={height} onTaskClick={onOpenTask} ariaLabel="任务径向脑图" />
  )
}
