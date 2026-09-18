import { useEffect, useRef } from 'react'
import type { EChartsType } from 'echarts/core'
import type { EChartsOption } from '../../../lib/echarts'
import { echarts } from '../../../lib/echarts'
import { usePreferences } from '../../../store/preferences'

interface MindMapChartProps {
  option: EChartsOption
  height: number
  onTaskClick?: (taskId: number) => void
  ariaLabel: string
}

export function MindMapChart({ option, height, onTaskClick, ariaLabel }: MindMapChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const { resolvedTheme } = usePreferences()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const chart = echarts.init(container, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onTaskClick) return
    const handler = (params: { data?: unknown }) => {
      const data = params.data as { taskId?: number; id?: string } | undefined
      if (!data) return
      if (typeof data.taskId === 'number') {
        onTaskClick(data.taskId)
        return
      }
      if (typeof data.id === 'string') {
        const match = /^task-(\d+)$/.exec(data.id)
        if (match) onTaskClick(Number(match[1]))
      }
    }
    chart.on('click', handler)
    return () => {
      chart.off('click', handler)
    }
  }, [onTaskClick])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.resize()
  }, [height, resolvedTheme])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      style={{ height }}
      className="w-full"
    />
  )
}
