import { useMemo } from 'react'
import type { Status, Task } from '../../../lib/types'
import type { EChartsOption } from '../../../lib/echarts'
import { buildSunburstData, formatTaskTooltip } from '../../../lib/mindmap'
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
  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  )
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const data = useMemo(() => buildSunburstData(tasks, statuses), [tasks, statuses])

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgb(var(--c-elevated))',
        borderColor: 'rgb(var(--c-line))',
        textStyle: { color: 'rgb(var(--c-ink))', fontSize: 12 },
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
          radius: [0, '92%'],
          sort: undefined,
          nodeClick: false,
          emphasis: { focus: 'ancestor' },
          itemStyle: { borderColor: 'rgb(var(--c-canvas))', borderWidth: 1 },
          label: {
            color: 'rgb(var(--c-ink))',
            fontSize: 11,
            minAngle: 8,
            rotate: 'radial',
            overflow: 'truncate',
          },
          levels: [
            {},
            { r0: '18%', r: '38%', label: { fontSize: 12, fontWeight: 600 } },
            { r0: '38%', r: '62%', label: { fontSize: 11 } },
            { r0: '62%', r: '92%', label: { fontSize: 10, minAngle: 12 } },
          ],
          data,
        },
      ],
    }),
    [data, taskMap, statusMap],
  )

  return (
    <MindMapChart option={option} height={height} onTaskClick={onOpenTask} ariaLabel="任务径向脑图" />
  )
}
