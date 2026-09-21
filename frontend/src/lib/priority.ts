import type { CSSProperties } from 'react'
import type { Priority } from './types'
import { isDarkColor } from './chartTheme'
import { taskColor } from './taskColor'

// 数据未加载时的兜底优先级（与后端默认三条一致）。
export const FALLBACK_PRIORITIES: Priority[] = [
  { id: 1, name: '低', color: '#6b7280', level: 1, position: 1, task_count: 0 },
  { id: 2, name: '中', color: '#f59e0b', level: 2, position: 2, task_count: 0 },
  { id: 3, name: '高', color: '#ef4444', level: 3, position: 3, task_count: 0 },
]

// 便签底色档位：按优先级在列表中的相对位置映射到三档。
export type NoteTone = 'low' | 'medium' | 'high'

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
 * 将任意优先级 id 映射到便签三档色调：
 * 最高档 → high，最低档 → low，其余 → medium。
 */
export function noteToneFor(priorities: Priority[], id: number): NoteTone {
  if (priorities.length === 0) {
    if (id >= 3) return 'high'
    if (id === 2) return 'medium'
    return 'low'
  }
  const maxLevel = Math.max(...priorities.map((item) => item.level))
  const minLevel = Math.min(...priorities.map((item) => item.level))
  const level = priorityById(priorities, id)?.level ?? maxLevel
  if (maxLevel === minLevel) return 'medium'
  if (level >= maxLevel) return 'high'
  if (level <= minLevel) return 'low'
  return 'medium'
}

export function noteSurfaceClassFor(
  priorities: Priority[],
  id: number,
  isDone: boolean,
): string {
  if (isDone) return 'note-surface-low'
  return `note-surface-${noteToneFor(priorities, id)}`
}

/** 根据背景色决定文字用深色还是浅色（用于彩色优先级徽标）。 */
export function priorityTextOn(color: string): string {
  return isDarkColor(color) ? 'text-white' : 'text-black'
}

/**
 * 卡片底色：自定义颜色时用内联变量 `--card-tint`（alpha 由 `--app-card-alpha` 控制），
 * 否则走优先级三档便签色。两者都受「卡片不透明度」滑块影响。
 * `accent` 用于卡片左缘颜色条（实心，便于扫描定位）。
 */
export function cardSurfaceStyle(
  task: { color: string | null; priority: number },
  priorities: Priority[],
  isDone: boolean,
  isDark: boolean,
): { className: string; accent: string; style?: CSSProperties } {
  const accent = isDone
    ? 'rgb(111 115 127)'
    : taskColor(task, priorities, isDark)
  if (task.color) {
    return {
      className: 'note-surface-custom',
      accent,
      style: { '--card-tint': accent } as CSSProperties,
    }
  }
  return { className: noteSurfaceClassFor(priorities, task.priority, isDone), accent }
}

/**
 * 预览窗（放大版卡片）抬头底色：不用卡片便签色，而是把强调色交给
 * `.preview-tint` 淡混进 `--c-surface`，深浅两套比例在 CSS 里定义。
 * 强调色同样走 `taskColor()`（自定义色优先 → 优先级色），已归档/已完成回落中性灰。
 */
export function previewTintStyle(
  task: { color: string | null; priority: number },
  priorities: Priority[],
  isDone: boolean,
  isDark: boolean,
): { className: string; style: CSSProperties } {
  const tint = isDone ? 'rgb(111 115 127)' : taskColor(task, priorities, isDark)
  return {
    className: 'preview-tint',
    style: { '--preview-tint': tint } as CSSProperties,
  }
}
