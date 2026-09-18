import type { Group, Status, Task } from './types'
import { withAlpha } from './chartTheme'
import type { ChartPalette } from './chartTheme'

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

export const UNGROUPED_COLOR = '#94a3b8'
export const UNGROUPED_NAME = '未分组'

export interface TaskGroupSection {
  id: number | null
  name: string
  color: string
  count: number
  tasks: Task[]
  priorities: PriorityGroup[]
}

// 按任务分组拆分为区块，组按 position 排序，未分组固定排在最后。
export function groupSections(tasks: Task[], statuses: Status[]): TaskGroupSection[] {
  const byGroup = new Map<number | null, Task[]>()
  const meta = new Map<number, Group>()

  for (const task of tasks) {
    const id = task.group?.id ?? null
    if (task.group) meta.set(task.group.id, task.group)
    const bucket = byGroup.get(id)
    if (bucket) bucket.push(task)
    else byGroup.set(id, [task])
  }

  const sections: TaskGroupSection[] = []
  const ordered = [...meta.values()].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  )
  for (const group of ordered) {
    const items = byGroup.get(group.id)
    if (!items || items.length === 0) continue
    sections.push({
      id: group.id,
      name: group.name,
      color: group.color,
      count: items.length,
      tasks: items,
      priorities: groupTasks(items, statuses),
    })
  }

  const ungrouped = byGroup.get(null)
  if (ungrouped && ungrouped.length > 0) {
    sections.push({
      id: null,
      name: UNGROUPED_NAME,
      color: UNGROUPED_COLOR,
      count: ungrouped.length,
      tasks: ungrouped,
      priorities: groupTasks(ungrouped, statuses),
    })
  }

  return sections
}

export interface MindMapTooltipMeta {
  task: Task
  status?: Status
}

export function formatTaskTooltip({ task, status }: MindMapTooltipMeta): string {
  const priority = priorityShortLabel(task.priority)
  const statusName = status?.name ?? '未分配'
  const overdue = !task.completed_at && task.due_date != null && task.due_date < todayISO()
  const due = task.due_date
    ? `${task.due_date}${overdue ? '（已逾期）' : ''}`
    : '未设置'
  const doneCount = task.subtasks.filter((item) => item.is_done).length
  const rows = [
    `<div style="font-weight:600;font-size:13px;margin-bottom:6px">${escapeHtml(task.title)}</div>`,
    `<div style="border-top:1px solid rgba(128,128,140,0.25);margin-bottom:5px"></div>`,
    `<div>状态：${escapeHtml(statusName)}${task.completed_at ? '（已完成）' : ''}</div>`,
    `<div>优先级：${priority}</div>`,
    `<div>截止：<span style="color:${overdue ? '#ef4444' : 'inherit'}">${escapeHtml(due)}</span></div>`,
  ]
  if (task.group) {
    rows.push(`<div>分组：${escapeHtml(task.group.name)}</div>`)
  }
  if (task.subtasks.length > 0) {
    rows.push(`<div>子任务：${doneCount}/${task.subtasks.length}</div>`)
  }
  return rows.join('')
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
  label?: { color?: string; fontWeight?: number }
  lineStyle?: { color?: string }
  collapsed?: boolean
  children?: EChartsTreeNode[]
}

function priorityNodes(
  groups: PriorityGroup[],
  palette: ChartPalette,
  idPrefix: string,
): EChartsTreeNode[] {
  return groups.map((group) => ({
    id: `${idPrefix}priority-${group.priority}`,
    name: `${priorityShortLabel(group.priority)}优先级`,
    value: group.count,
    itemStyle: { color: palette.priority[group.priority] },
    symbolSize: 11,
    lineStyle: { color: withAlpha(palette.priority[group.priority], 0.55) },
    children: group.branches.map((branch) => ({
      id: `${idPrefix}status-${group.priority}-${branch.statusId ?? 'none'}`,
      name: branch.name,
      value: branch.total,
      itemStyle: { color: branch.color },
      symbolSize: 9,
      children: branchTasks(
        branch,
        palette,
        `${idPrefix}${group.priority}-${branch.statusId ?? 'none'}`,
      ),
    })),
  }))
}

function sunburstPriorityNodes(
  groups: PriorityGroup[],
  palette: ChartPalette,
  idPrefix: string,
): EChartsTreeNode[] {
  return groups.map((group) => ({
    id: `${idPrefix}priority-${group.priority}`,
    name: `${priorityShortLabel(group.priority)}优先级`,
    value: group.count,
    itemStyle: { color: palette.priority[group.priority] },
    children: group.branches.map((branch) => ({
      id: `${idPrefix}status-${group.priority}-${branch.statusId ?? 'none'}`,
      name: branch.name,
      value: branch.total,
      itemStyle: { color: branch.color },
      children: branchTasks(
        branch,
        palette,
        `${idPrefix}${group.priority}-${branch.statusId ?? 'none'}`,
      ).map((node) => ({
        ...node,
        value: 1,
        itemStyle: { color: withAlpha(node.itemStyle?.color ?? palette.root, 0.82) },
      })),
    })),
  }))
}

export function buildTreeData(
  tasks: Task[],
  statuses: Status[],
  palette: ChartPalette,
  groupBy = false,
): EChartsTreeNode {
  const children = groupBy
    ? groupSections(tasks, statuses).map((section) => ({
        id: `group-${section.id ?? 'none'}`,
        name: section.name,
        value: section.count,
        itemStyle: { color: section.color },
        symbolSize: 12,
        lineStyle: { color: withAlpha(section.color, 0.55) },
        children: priorityNodes(section.priorities, palette, `group-${section.id ?? 'none'}-`),
      }))
    : priorityNodes(groupTasks(tasks, statuses), palette, '')

  return {
    id: ROOT_ID,
    name: ROOT_LABEL,
    value: tasks.length,
    itemStyle: { color: palette.root },
    symbolSize: 14,
    children,
  }
}

export function buildSunburstData(
  tasks: Task[],
  statuses: Status[],
  palette: ChartPalette,
  groupBy = false,
): EChartsTreeNode[] {
  const children = groupBy
    ? groupSections(tasks, statuses).map((section) => ({
        id: `group-${section.id ?? 'none'}`,
        name: section.name,
        value: section.count,
        itemStyle: { color: section.color },
        children: sunburstPriorityNodes(
          section.priorities,
          palette,
          `group-${section.id ?? 'none'}-`,
        ),
      }))
    : sunburstPriorityNodes(groupTasks(tasks, statuses), palette, '')

  return [
    {
      id: ROOT_ID,
      name: ROOT_LABEL,
      value: tasks.length,
      itemStyle: { color: palette.root },
      children,
    },
  ]
}

function branchTasks(
  branch: Branch,
  palette: ChartPalette,
  moreKey: string,
): EChartsTreeNode[] {
  const nodes: EChartsTreeNode[] = branch.tasks.map((task) => ({
    id: `task-${task.id}`,
    name: task.completed_at != null ? `${task.title}` : task.title,
    value: 1,
    itemStyle: { color: palette.priority[task.priority] ?? palette.muted },
    label: task.completed_at != null ? { color: palette.muted } : undefined,
  }))
  if (branch.hidden > 0) {
    nodes.push({
      id: `more-${moreKey}${MORE_SUFFIX}`,
      name: `还有 ${branch.hidden} 个…`,
      value: branch.hidden,
      itemStyle: { color: palette.muted },
      label: { color: palette.muted },
    })
  }
  return nodes
}


export interface SankeyNode {
  name: string
  depth: number
  itemStyle?: { color?: string }
  label?: { color?: string; fontWeight?: number }
  // 自定义字段，供 label/tooltip formatter 使用
  display?: string
  taskId?: number
  done?: boolean
  completed?: number
  total?: number
}

export interface SankeyLink {
  source: string
  target: string
  value: number
  lineStyle?: { color?: string; opacity?: number }
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

// ECharts sankey 以 name 作为节点唯一键，同名状态（如不同优先级下的「待办」）
// 会互相覆盖，因此内部用组合键，显示名由 node.display 提供。
export function sankeyNodeId(prefix: string, key: string): string {
  return `${prefix}::${key}`
}

export function buildSankeyData(
  tasks: Task[],
  statuses: Status[],
  palette: ChartPalette,
  groupBy = false,
): SankeyData {
  const rootName = sankeyNodeId('root', 'all')
  const nodes: SankeyNode[] = [
    {
      name: rootName,
      depth: 0,
      display: ROOT_LABEL,
      itemStyle: { color: palette.root },
      total: tasks.length,
    },
  ]
  const links: SankeyLink[] = []

  const emitPriorities = (
    priorityGroups: PriorityGroup[],
    parentId: string,
    depth: number,
    keyPrefix: string,
  ) => {
    for (const group of priorityGroups) {
      const priorityId = sankeyNodeId('priority', `${keyPrefix}${group.priority}`)
      const color = palette.priority[group.priority] ?? palette.muted
      const groupDone = group.branches
        .flatMap((branch) => branch.tasks)
        .filter((task) => task.completed_at != null).length

      nodes.push({
        name: priorityId,
        depth,
        display: `${priorityShortLabel(group.priority)}优先级 · ${groupDone}/${group.count}`,
        itemStyle: { color },
        label: { fontWeight: 600 },
        completed: groupDone,
        total: group.count,
      })
      links.push({
        source: parentId,
        target: priorityId,
        value: group.count,
        lineStyle: { color, opacity: 0.42 },
      })

      const branchPrefix = `${keyPrefix}${group.priority}-`
      for (const branch of group.branches) {
        const statusId = sankeyNodeId(
          'status',
          `${branchPrefix}${branch.statusId ?? 'none'}`,
        )
        nodes.push({
          name: statusId,
          depth: depth + 1,
          display: branch.name,
          itemStyle: { color: branch.color },
          total: branch.total,
        })
        links.push({
          source: priorityId,
          target: statusId,
          value: branch.total,
          lineStyle: { color: branch.color, opacity: 0.42 },
        })

        for (const task of branch.tasks) {
          const taskNodeId = sankeyNodeId('task', String(task.id))
          nodes.push({
            name: taskNodeId,
            depth: depth + 2,
            display: task.title,
            itemStyle: {
              color: task.completed_at != null ? palette.done : color,
            },
            label: task.completed_at != null ? { color: palette.muted } : undefined,
            taskId: task.id,
            done: task.completed_at != null,
          })
          links.push({
            source: statusId,
            target: taskNodeId,
            value: 1,
            lineStyle: { color: branch.color, opacity: 0.32 },
          })
        }

        if (branch.hidden > 0) {
          const moreId = sankeyNodeId(
            'more',
            `${branchPrefix}${branch.statusId ?? 'none'}`,
          )
          nodes.push({
            name: moreId,
            depth: depth + 2,
            display: `还有 ${branch.hidden} 个…`,
            itemStyle: { color: palette.muted },
            label: { color: palette.muted },
          })
          links.push({
            source: statusId,
            target: moreId,
            value: branch.hidden,
            lineStyle: { color: branch.color, opacity: 0.2 },
          })
        }
      }
    }
  }

  if (groupBy) {
    for (const section of groupSections(tasks, statuses)) {
      const groupId = sankeyNodeId('group', String(section.id ?? 'none'))
      const groupDone = section.tasks.filter(
        (task) => task.completed_at != null,
      ).length
      nodes.push({
        name: groupId,
        depth: 1,
        display: `${section.name} · ${groupDone}/${section.count}`,
        itemStyle: { color: section.color },
        label: { fontWeight: 600 },
        completed: groupDone,
        total: section.count,
      })
      links.push({
        source: rootName,
        target: groupId,
        value: section.count,
        lineStyle: { color: section.color, opacity: 0.42 },
      })
      emitPriorities(
        section.priorities,
        groupId,
        2,
        `group-${section.id ?? 'none'}-`,
      )
    }
  } else {
    emitPriorities(groupTasks(tasks, statuses), rootName, 1, '')
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
