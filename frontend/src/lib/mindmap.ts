import type { Status, Task } from './types'

export const PRIORITY_LEVELS = [3, 2, 1] as const

export const PRIORITY_WEIGHT: Record<number, number> = { 1: 1, 2: 2, 3: 3 }

// 综合评分：优先级权重与最近更新时间权重的占比。
export const PRIORITY_FACTOR = 1
export const RECENCY_FACTOR = 1

// 每个「优先级 → 状态」分支最多展开的任务节点数。
export const BRANCH_LIMIT = 8

export function priorityLabel(priority: number): string {
  if (priority >= 3) return '高优先级'
  if (priority === 2) return '中优先级'
  return '低优先级'
}

export function priorityShortLabel(priority: number): string {
  if (priority >= 3) return '高'
  if (priority === 2) return '中'
  return '低'
}

export function priorityColor(priority: number): string {
  if (priority >= 3) return '#ef4444'
  if (priority === 2) return '#f59e0b'
  return '#6b7280'
}

function recencyScore(updatedAt: string): number {
  const time = new Date(updatedAt).getTime()
  if (Number.isNaN(time)) return 0
  const hours = (Date.now() - time) / 3600000
  if (hours <= 1) return 3
  if (hours <= 24) return 2
  if (hours <= 24 * 7) return 1
  return 0
}

export function taskScore(task: Task): number {
  const priority = PRIORITY_WEIGHT[task.priority] ?? 0
  return priority * PRIORITY_FACTOR + recencyScore(task.updated_at) * RECENCY_FACTOR
}

export interface Branch {
  statusId: number | null
  name: string
  color: string
  tasks: Task[]
  hidden: number
  total: number
}

export interface PriorityGroup {
  priority: number
  branches: Branch[]
  count: number
}

export function groupTasks(tasks: Task[], statuses: Status[]): PriorityGroup[] {
  const sortedStatuses = [...statuses].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  )
  const hasUnassigned = tasks.some((task) => task.status_id == null)

  return PRIORITY_LEVELS.map((priority) => {
    const inPriority = tasks.filter((task) => task.priority === priority)
    const branches: Branch[] = []

    const pushBranch = (statusId: number | null, name: string, color: string) => {
      const items = inPriority
        .filter((task) => task.status_id === statusId)
        .sort((a, b) => {
          const diff = taskScore(b) - taskScore(a)
          if (diff !== 0) return diff
          return b.updated_at.localeCompare(a.updated_at)
        })
      if (items.length === 0) return
      branches.push({
        statusId,
        name,
        color,
        tasks: items.slice(0, BRANCH_LIMIT),
        hidden: Math.max(0, items.length - BRANCH_LIMIT),
        total: items.length,
      })
    }

    for (const status of sortedStatuses) {
      pushBranch(status.id, status.name, status.color)
    }
    if (hasUnassigned) {
      pushBranch(null, '未分配', '#94a3b8')
    }

    return {
      priority,
      branches,
      count: inPriority.length,
    }
  }).filter((group) => group.count > 0)
}

export interface MindMapTooltipMeta {
  task: Task
  status?: Status
}

export function formatTaskTooltip({ task, status }: MindMapTooltipMeta): string {
  const priority = priorityShortLabel(task.priority)
  const statusName = status?.name ?? '未分配'
  const due = task.due_date
    ? `${task.due_date}${!task.completed_at && task.due_date < todayISO() ? '（已逾期）' : ''}`
    : '未设置'
  return [
    `<div style="font-weight:600;margin-bottom:4px">${escapeHtml(task.title)}</div>`,
    `<div>状态：${escapeHtml(statusName)}</div>`,
    `<div>优先级：${priority}</div>`,
    `<div>截止：${escapeHtml(due)}</div>`,
  ].join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function todayISO(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

const MORE_SUFFIX = '__more__'
const ROOT_ID = 'root'
const ROOT_LABEL = '全部任务'

export interface EChartsTreeNode {
  id: string
  name: string
  value?: number
  itemStyle?: { color?: string }
  symbolSize?: number
  collapsed?: boolean
  children?: EChartsTreeNode[]
}

export function buildTreeData(tasks: Task[], statuses: Status[]): EChartsTreeNode {
  const groups = groupTasks(tasks, statuses)
  return {
    id: ROOT_ID,
    name: ROOT_LABEL,
    value: tasks.length,
    itemStyle: { color: '#5e6ad2' },
    children: groups.map((group) => ({
      id: `priority-${group.priority}`,
      name: `${priorityShortLabel(group.priority)}优先级`,
      value: group.count,
      itemStyle: { color: priorityColor(group.priority) },
      children: group.branches.map((branch) => ({
        id: `status-${group.priority}-${branch.statusId ?? 'none'}`,
        name: branch.name,
        value: branch.total,
        itemStyle: { color: branch.color },
        children: branchTasks(branch),
      })),
    })),
  }
}

export function buildSunburstData(tasks: Task[], statuses: Status[]): EChartsTreeNode[] {
  const groups = groupTasks(tasks, statuses)
  return [
    {
      id: ROOT_ID,
      name: ROOT_LABEL,
      value: tasks.length,
      itemStyle: { color: '#5e6ad2' },
      children: groups.map((group) => ({
        id: `priority-${group.priority}`,
        name: `${priorityShortLabel(group.priority)}优先级`,
        value: group.count,
        itemStyle: { color: priorityColor(group.priority) },
        children: group.branches.map((branch) => ({
          id: `status-${group.priority}-${branch.statusId ?? 'none'}`,
          name: branch.name,
          value: branch.total,
          itemStyle: { color: branch.color },
          children: branchTasks(branch).map((node) => ({
            ...node,
            value: 1,
          })),
        })),
      })),
    },
  ]
}

function branchTasks(branch: Branch): EChartsTreeNode[] {
  const nodes: EChartsTreeNode[] = branch.tasks.map((task) => ({
    id: `task-${task.id}`,
    name: task.title,
    value: 1,
    itemStyle: { color: priorityColor(task.priority) },
  }))
  if (branch.hidden > 0) {
    nodes.push({
      id: `more-${branch.statusId ?? 'none'}${MORE_SUFFIX}`,
      name: `还有 ${branch.hidden} 个…`,
      value: branch.hidden,
      itemStyle: { color: '#94a3b8' },
    })
  }
  return nodes
}

export interface SankeyNode {
  name: string
  depth: number
  itemStyle?: { color?: string }
}

export interface SankeyLink {
  source: string
  target: string
  value: number
  lineStyle?: { color?: string }
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

// ECharts sankey 以 name 作为节点唯一键，同名状态（如不同优先级下的「待办」）
// 会互相覆盖，因此内部用 `优先级::状态` 组合键，显示名由 label.formatter 还原。
export function sankeyNodeId(prefix: string, key: string): string {
  return `${prefix}::${key}`
}

export function buildSankeyData(tasks: Task[], statuses: Status[]): SankeyData {
  const groups = groupTasks(tasks, statuses)
  const nodes: SankeyNode[] = [{ name: '全部任务', depth: 0 }]
  const links: SankeyLink[] = []

  nodes.push({ name: '已完成', depth: 1, itemStyle: { color: '#22c55e' } })
  nodes.push({ name: '未完成', depth: 1, itemStyle: { color: '#ef4444' } })

  const done = tasks.filter((task) => task.completed_at != null).length
  const pending = tasks.length - done
  if (done > 0) links.push({ source: '全部任务', target: '已完成', value: done })
  if (pending > 0) links.push({ source: '全部任务', target: '未完成', value: pending })

  for (const group of groups) {
    const priorityId = sankeyNodeId('priority', String(group.priority))
    nodes.push({
      name: priorityId,
      depth: 2,
      itemStyle: { color: priorityColor(group.priority) },
    })
    const groupDone = group.branches
      .flatMap((branch) => branch.tasks)
      .filter((task) => task.completed_at != null).length
    const groupPending = group.count - groupDone
    if (groupDone > 0) {
      links.push({
        source: '已完成',
        target: priorityId,
        value: groupDone,
        lineStyle: { color: priorityColor(group.priority) },
      })
    }
    if (groupPending > 0) {
      links.push({
        source: '未完成',
        target: priorityId,
        value: groupPending,
        lineStyle: { color: priorityColor(group.priority) },
      })
    }

    for (const branch of group.branches) {
      const statusId = sankeyNodeId('status', `${group.priority}-${branch.statusId ?? 'none'}`)
      nodes.push({
        name: statusId,
        depth: 3,
        itemStyle: { color: branch.color },
      })
      links.push({
        source: priorityId,
        target: statusId,
        value: branch.total,
        lineStyle: { color: branch.color },
      })
    }
  }

  return { nodes, links }
}

export interface SwimlaneCell {
  priority: number
  statusId: number | null
  total: number
  tasks: Task[]
}

export interface SwimlaneData {
  statuses: Array<{ id: number | null; name: string; color: string }>
  priorities: number[]
  cells: SwimlaneCell[]
}

export function buildSwimlaneData(tasks: Task[], statuses: Status[]): SwimlaneData {
  const groups = groupTasks(tasks, statuses)
  const statusColumns: Array<{ id: number | null; name: string; color: string }> = []

  const sortedStatuses = [...statuses].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  )
  for (const status of sortedStatuses) {
    if (tasks.some((task) => task.status_id === status.id)) {
      statusColumns.push({ id: status.id, name: status.name, color: status.color })
    }
  }
  if (tasks.some((task) => task.status_id == null)) {
    statusColumns.push({ id: null, name: '未分配', color: '#94a3b8' })
  }

  const priorityRows = groups.map((group) => group.priority)
  const cells: SwimlaneCell[] = []

  for (const group of groups) {
    for (const column of statusColumns) {
      const branch = group.branches.find((item) => item.statusId === column.id)
      if (!branch) continue
      cells.push({
        priority: group.priority,
        statusId: column.id,
        total: branch.total,
        tasks: branch.tasks,
      })
    }
  }

  return { statuses: statusColumns, priorities: priorityRows, cells }
}
