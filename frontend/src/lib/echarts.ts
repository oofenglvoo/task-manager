import * as echarts from 'echarts/core'
import { SankeyChart, SunburstChart, TreeChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  SankeyChart,
  SunburstChart,
  TreeChart,
  TooltipComponent,
  CanvasRenderer,
])

export { echarts }
export type { EChartsOption } from 'echarts'
