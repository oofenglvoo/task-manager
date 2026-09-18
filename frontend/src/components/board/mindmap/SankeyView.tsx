import { useMemo } from 'react'
import type { DefaultLabelFormatterCallbackParams } from 'echarts'
import type { Status, Task } from '../../../lib/types'
import type { EChartsOption } from '../../../lib/echarts'
import { buildSankeyData, priorityShortLabel } from '../../../lib/mindmap'
import { MindMapChart } from './MindMapChart'

interface SankeyViewProps {
  tasks: Task[]
  statuses: Status[]
  height: number
}

function nodeName(data: DefaultLabelFormatterCallbackParams['data']): string {
  if (data && typeof data === 'object' && 'name' in data) {
    const name = (data as { name?: unknown }).name
    if (typeof name === 'string') return name
  }
  return ''
}

function displayName(raw: string): string {
  const parts = raw.split('::')
  if (parts[0] === 'priority') {
    return `${priorityShortLabel(Number(parts[1]))}优先级`
  }
  return parts[parts.length - 1]
}

export function SankeyView({ tasks, statuses, height }: SankeyViewProps) {
  const data = useMemo(() => buildSankeyData(tasks, statuses), [tasks, statuses])

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
          const p = params as {
            dataType?: string
            data?: { name?: string; value?: number; source?: string; target?: string }
          }
          if (p.dataType === 'edge') {
            const source = displayName(p.data?.source ?? '')
            const target = displayName(p.data?.target ?? '')
            return `<div style="font-weight:600">${source} → ${target}</div><div>任务数：${p.data?.value ?? 0}</div>`
          }
          return `<div style="font-weight:600">${displayName(p.data?.name ?? '')}</div>`
        },
      },
      series: [
        {
          type: 'sankey',
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
          nodeWidth: 14,
          nodeGap: 10,
          draggable: false,
          emphasis: { focus: 'adjacency' },
          label: {
            color: 'rgb(var(--c-ink))',
            fontSize: 11,
            formatter: (params: DefaultLabelFormatterCallbackParams) =>
              displayName(nodeName(params.data)),
          },
          data: data.nodes,
          links: data.links,
        },
      ],
    }),
    [data],
  )

  return (
    <MindMapChart option={option} height={height} ariaLabel="任务桑基流带图" />
  )
}
