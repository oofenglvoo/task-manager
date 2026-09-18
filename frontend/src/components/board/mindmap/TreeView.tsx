import { useMemo } from 'react'
import type { Status, Task } from '../../../lib/types'
import type { EChartsOption } from '../../../lib/echarts'
import { buildTreeData, formatTaskTooltip } from '../../../lib/mindmap'
import { MindMapChart } from './MindMapChart'

interface TreeViewProps {
  tasks: Task[]
  statuses: Status[]
  height: number
  onOpenTask: (taskId: number) => void
}

function taskIdFromNodeId(id: string): number | null {
  const match = /^task-(\d+)$/.exec(id)
  return match ? Number(match[1]) : null
}

export function TreeView({ tasks, statuses, height, onOpenTask }: TreeViewProps) {
  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  )
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const data = useMemo(() => buildTreeData(tasks, statuses), [tasks, statuses])

  const option = useMemo<EChartsOption>(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        confine: true,
        backgroundColor: 'rgb(var(--c-elevated))',
        borderColor: 'rgb(var(--c-line))',
        textStyle: { color: 'rgb(var(--c-ink))', fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { data?: { id?: string; name?: string; value?: number } }
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
          type: 'tree',
          orient: 'LR',
          left: 12,
          right: 12,
          top: 12,
          bottom: 12,
          symbol: 'emptyCircle',
          symbolSize: 6,
          expandAndCollapse: false,
          initialTreeDepth: -1,
          roam: true,
          lineStyle: { color: 'rgb(var(--c-line-strong))', width: 1.2, curveness: 0.5 },
          label: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            color: 'rgb(var(--c-ink))',
            fontSize: 11,
            overflow: 'truncate',
            width: 130,
          },
          leaves: {
            label: {
              position: 'right',
              align: 'left',
            },
          },
          emphasis: { focus: 'descendant' },
          data: [data],
        },
      ],
    }),
    [data, taskMap, statusMap],
  )

  return (
    <MindMapChart option={option} height={height} onTaskClick={onOpenTask} ariaLabel="任务四列树状图" />
  )
}
