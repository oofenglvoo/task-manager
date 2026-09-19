import { useMemo } from 'react'
import { usePriorities } from '../hooks/queries'
import { FALLBACK_PRIORITIES } from '../lib/priority'
import type { Priority } from '../lib/types'

export interface PrioritiesMeta {
  priorities: Priority[]
  /** 按 level 降序（高优先级在前）。 */
  sorted: Priority[]
  byId: (id: number) => Priority | undefined
  label: (id: number) => string
  color: (id: number) => string
  loading: boolean
}

/**
 * 统一的优先级数据源：请求结果未就绪时回退到默认三条，
 * 避免组件在加载期间显示空标签。
 */
export function usePrioritiesMeta(): PrioritiesMeta {
  const { data, isLoading } = usePriorities()
  const priorities = data && data.length > 0 ? data : FALLBACK_PRIORITIES

  return useMemo(() => {
    const map = new Map(priorities.map((item) => [item.id, item]))
    const sorted = [...priorities].sort(
      (a, b) => b.level - a.level || a.position - b.position || a.id - b.id,
    )
    return {
      priorities,
      sorted,
      byId: (id) => map.get(id),
      label: (id) => map.get(id)?.name ?? `优先级 ${id}`,
      color: (id) => map.get(id)?.color ?? '#6b7280',
      loading: isLoading,
    }
  }, [priorities, isLoading])
}
