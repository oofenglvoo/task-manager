// 图表统一样式：深/浅色主题下的调色板、字体与 tooltip 样式。
// 各视图在 resolvedTheme 变化时重建 option，因此这里用 isDark 分支而非 CSS 变量，
// 但取值仍与 index.css 中的 --c-* 语义保持一致。

export interface ChartPalette {
  priority: Record<number, string>
  root: string
  line: string
  lineStrong: string
  text: string
  subText: string
  muted: string
  surface: string
  elevated: string
  canvas: string
  done: string
}

export function chartPalette(isDark: boolean): ChartPalette {
  return {
    priority: isDark
      ? { 1: '#8b93a7', 2: '#f0b45a', 3: '#f07070' }
      : { 1: '#6b7280', 2: '#d97706', 3: '#dc2626' },
    root: isDark ? '#7c86e8' : '#4f5bc8',
    line: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(16,17,26,0.14)',
    lineStrong: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(16,17,26,0.28)',
    text: isDark ? 'rgb(236 236 241)' : 'rgb(24 25 31)',
    subText: isDark ? 'rgb(165 165 176)' : 'rgb(82 84 96)',
    muted: isDark ? 'rgb(130 132 144)' : 'rgb(132 135 148)',
    surface: isDark ? 'rgb(19 19 22)' : 'rgb(255 255 255)',
    elevated: isDark ? 'rgb(26 26 31)' : 'rgb(246 247 249)',
    canvas: isDark ? 'rgb(10 10 12)' : 'rgb(244 245 247)',
    done: isDark ? '#6f737f' : '#9aa0ad',
  }
}

export function chartFontFamily(): string {
  return 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
}

export interface ChartTooltipStyle {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  padding: [number, number]
  textStyle: { color: string; fontSize: number; fontFamily: string }
  extraCssText: string
}

export function chartTooltipStyle(isDark: boolean): ChartTooltipStyle {
  const palette = chartPalette(isDark)
  return {
    backgroundColor: palette.elevated,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: [8, 12],
    textStyle: {
      color: palette.text,
      fontSize: 12,
      fontFamily: chartFontFamily(),
    },
    extraCssText:
      'box-shadow: 0 8px 24px rgba(0,0,0,0.28); line-height: 1.7; backdrop-filter: blur(6px);',
  }
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((value) => Number.isNaN(value))) return hex
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
