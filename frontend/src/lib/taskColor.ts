import { isDarkColor } from './chartTheme'
import type { Priority, Task } from './types'

/** 优先级 id → 便签底色（低/中/高三档由优先级 level 决定）。 */
const TONE_BY_LEVEL: Record<number, string> = {
  1: '#5c5c68',
  2: '#b07a16',
  3: '#ac3e3e',
}

/**
 * 任务卡片颜色：优先使用任务自定义颜色，未设置时按优先级 level 回落到三档便签色。
 * 深色主题下过暗的自定义色会被提亮，避免在暗背景上看不清。
 */
export function taskColor(
  task: Pick<Task, 'color' | 'priority'>,
  priorities: Priority[],
  isDark: boolean,
): string {
  if (task.color) {
    return isDark && isDarkColor(task.color) ? lighten(task.color) : task.color
  }
  return priorityColor(task.priority, priorities, isDark)
}

/** 优先级颜色（图表/图例与卡片兜底色统一走这里）。 */
export function priorityColor(
  priorityId: number,
  priorities: Priority[],
  isDark: boolean,
): string {
  const found = priorities.find((item) => item.id === priorityId)
  if (found) {
    return isDark && isDarkColor(found.color) ? lighten(found.color) : found.color
  }
  const level = TONE_BY_LEVEL[priorityId] ? priorityId : 2
  return TONE_BY_LEVEL[level]
}

function lighten(hex: string, amount = 0.35): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized
  const channels = [0, 2, 4].map((index) =>
    parseInt(full.slice(index, index + 2), 16),
  )
  if (channels.some((value) => Number.isNaN(value))) return hex
  return `#${channels
    .map((value) => Math.round(value + (255 - value) * amount))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}
