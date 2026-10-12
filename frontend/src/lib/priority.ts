import type { CSSProperties } from 'react'
import type { Priority } from './types'
import { taskColor } from './taskColor'

// 数据未加载时的兜底优先级（与后端默认三条一致）。
export const FALLBACK_PRIORITIES: Priority[] = [
  { id: 1, name: '低', color: '#6b7280', level: 1, position: 1, task_count: 0 },
  { id: 2, name: '中', color: '#f59e0b', level: 2, position: 2, task_count: 0 },
  { id: 3, name: '高', color: '#ef4444', level: 3, position: 3, task_count: 0 },
]

// 便签基色（与 index.css 的 --c-note-base 一致）与混合比例：
// 卡片底色 = 优先级/自定义颜色 与基色按主题比例混合，保证两种主题下文字都有对比度，
// 且每个优先级因自身色相不同而可区分（深色主题需要更高比例的本色才看得清）。
const NOTE_BASE: Record<'dark' | 'light', [number, number, number]> = {
  dark: [30, 30, 38],
  light: [255, 253, 244],
}
const WASH_RATIO: Record<'dark' | 'light', number> = { dark: 0.55, light: 0.22 }

/** 把颜色与便签基色按主题比例混合，得到带色相又不过分刺眼的卡片底色。 */
function washToNote(color: string, isDark: boolean): string {
  const base = NOTE_BASE[isDark ? 'dark' : 'light']
  const ratio = WASH_RATIO[isDark ? 'dark' : 'light']
  const normalized = color.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized
  if (full.length !== 6) return color
  const channels = [0, 2, 4].map((index) =>
    parseInt(full.slice(index, index + 2), 16),
  )
  if (channels.some((value) => Number.isNaN(value))) return color
  return `#${channels
    .map((value, index) =>
      Math.round(base[index] + (value - base[index]) * ratio)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

export function priorityById(
  priorities: Priority[],
  id: number,
): Priority | undefined {
  return priorities.find((item) => item.id === id)
}

export function priorityName(priorities: Priority[], id: number): string {
  return priorityById(priorities, id)?.name ?? `优先级 ${id}`
}

export function priorityColor(priorities: Priority[], id: number): string {
  return priorityById(priorities, id)?.color ?? '#6b7280'
}

/** 按 level 降序（高优先级在前），level 相同时按 position/id。 */
export function sortByLevelDesc(priorities: Priority[]): Priority[] {
  return [...priorities].sort(
    (a, b) => b.level - a.level || a.position - b.position || a.id - b.id,
  )
}

/**
 * 卡片底色：与优先级/自定义颜色同色相，和便签基色混合成淡色调后作为内联 `--card-tint`
 * （alpha 由 `--app-card-alpha` 控制，受「卡片不透明度」滑块影响）。
 * 已完成任务统一用中性灰档。`accent` 为左缘颜色条用的本色。
 */
export function cardSurfaceStyle(
  task: { color: string | null; priority: number },
  priorities: Priority[],
  isDone: boolean,
  isDark: boolean,
): { className: string; accent: string; style?: CSSProperties } {
  if (isDone) {
    return { className: 'note-surface-low', accent: 'rgb(111 115 127)' }
  }
  const color = taskColor(task, priorities, isDark)
  // 自定义颜色沿用本色；未自定义时按优先级颜色着色，与便签基色混合后仍能区分每个优先级。
  const tint = task.color ? color : washToNote(color, isDark)
  return {
    className: 'note-surface-custom',
    accent: color,
    style: { '--card-tint': tint } as CSSProperties,
  }
}

