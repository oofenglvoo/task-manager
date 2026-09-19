import type { Priority } from './types'
import { isDarkColor } from './chartTheme'

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
