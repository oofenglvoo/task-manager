import type { CSSProperties } from 'react'
import type { Group, Priority, Status, Task } from './types'
import { withAlpha } from './chartTheme'
import type { ChartPalette } from './chartTheme'
import { dueState, formatDue } from './utils'

// 综合评分：优先级权重与最近更新时间权重的占比。
export const PRIORITY_FACTOR = 1
export const RECENCY_FACTOR = 1

// 每个「优先级 → 状态」分支最多展开的任务节点数。
export const BRANCH_LIMIT = 8

/** 按 level 降序排列的优先级列表（高优先级在前）。 */
function orderedPriorities(priorities: Priority[]): Priority[] {
  return [...priorities].sort(
    (a, b) => b.level - a.level || a.position - b.position || a.id - b.id,
  )
}

function priorityById(priorities: Priority[], id: number): Priority | undefined {
  return priorities.find((item) => item.id === id)
}

/** 图表中的短标签，例如「高」。 */
function shortLabel(priorities: Priority[], id: number): string {
  return priorityById(priorities, id)?.name ?? `P${id}`
}

/** 图表中的长标签，例如「高优先级」。 */
function longLabel(priorities: Priority[], id: number): string {
  const name = priorityById(priorities, id)?.name ?? `P${id}`
  return `${name}优先级`
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

/** 优先级权重直接使用其 level（数值越大越优先）。 */
export function taskScore(task: Task, priorities: Priority[]): number {
  const level = priorityById(priorities, task.priority)?.level ?? 0
  return level * PRIORITY_FACTOR + recencyScore(task.updated_at) * RECENCY_FACTOR
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

export function groupTasks(
  tasks: Task[],
  statuses: Status[],
  priorities: Priority[],
): PriorityGroup[] {
  const sortedStatuses = [...statuses].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  )
  const hasUnassigned = tasks.some((task) => task.status_id == null)

  return orderedPriorities(priorities)
    .map((priority) => {
      const inPriority = tasks.filter((task) => task.priority === priority.id)
      const branches: Branch[] = []

      const pushBranch = (statusId: number | null, name: string, color: string) => {
        const items = inPriority
          .filter((task) => task.status_id === statusId)
          .sort((a, b) => {
            const diff = taskScore(b, priorities) - taskScore(a, priorities)
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
        priority: priority.id,
        branches,
        count: inPriority.length,
      }
    })
    .filter((group) => group.count > 0)
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
export function groupSections(
  tasks: Task[],
  statuses: Status[],
  priorities: Priority[],
): TaskGroupSection[] {
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
      priorities: groupTasks(items, statuses, priorities),
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
      priorities: groupTasks(ungrouped, statuses, priorities),
    })
  }

  return sections
}

// --------------------------------------------------------------------------- #
// 评分柱状图：分组顺序 > 组内顺序 > 优先级等级
// --------------------------------------------------------------------------- #

export interface ScoreBoardItem {
  id: number
  title: string
  score: number
  groupOrder: number
  taskOrder: number
  priorityLevel: number
  groupName: string
  priorityName: string
  /** 卡片底色类名（note-surface-*），与任务卡片取色规则完全一致。 */
  surfaceClass: string
  /** 自定义色的内联变量（--card-tint），无自定义色时为 undefined。 */
  surfaceStyle?: CSSProperties
}

/**
 * 按「分组顺序、组内任务顺序、优先级等级」加权求和给每个任务打分。
 *
 * - 分组顺序：分组在「分组管理」中的次序（`group.position`），未分组固定最后；
 *   该权重最高，因此分组的先后主导总分。
 * - 组内顺序：任务在当前排序（`position` 升序）下的先后，因此拖动卡片的顺序
 *   会直接影响分数。
 * - 优先级等级：`priority.level`（越大越优先）。
 *
 * 注意：排序序号越小越靠前，因此分值用「总数 − 序号 + 1」反转为正向权重，
 * 顺序越靠前权重越大、分数越高。
 *
 * 采用严格分层算法：`score = 分组权重 × STEP × SPAN + 组内权重 × SPAN + level`，
 * 其中 `STEP` / `SPAN` 取足够大的基数（任务数、优先级等级上限再加一），
 * 保证「更靠前的分组」严格高于「更靠后的分组」，任务再多、等级再高也不会串层。
 */
export function buildScoreBoardData(
  tasks: Task[],
  priorities: Priority[],
  paint: (task: Task) => { className: string; style?: CSSProperties },
): ScoreBoardItem[] {
  const active = tasks.filter((task) => !task.is_archived)
  const ordered = active.filter((task) => task.group != null)

  const groupIds: number[] = []
  for (const task of ordered) {
    const id = task.group?.id
    if (id != null && !groupIds.includes(id)) groupIds.push(id)
  }
  const groupOrder = new Map<number, number>()
  const groups = new Map<number, Group>()
  for (const task of ordered) {
    if (task.group) groups.set(task.group.id, task.group)
  }
  ;[...groups.values()]
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .forEach((group, index) => groupOrder.set(group.id, index + 1))

  const items: ScoreBoardItem[] = []
  const bucket = new Map<number | null, Task[]>()
  for (const task of active) {
    const key = task.group?.id ?? null
    const list = bucket.get(key)
    if (list) list.push(task)
    else bucket.set(key, [task])
  }

  const keys = [...bucket.keys()].sort((a, b) => {
    if (a == null) return 1
    if (b == null) return -1
    return (groupOrder.get(a) ?? 0) - (groupOrder.get(b) ?? 0)
  })

  const ungroupedRank = groupOrder.size + 1
  const groupCount = groupOrder.size
  const maxTaskCount = Math.max(
    1,
    ...[...bucket.keys()].map((key) => (bucket.get(key) ?? []).length),
  )
  const maxLevel = Math.max(
    1,
    ...priorities.map((item) => item.level ?? 0),
    ...tasks.map((task) => priorityById(priorities, task.priority)?.level ?? 0),
  )
  const taskSpan = maxTaskCount + 1
  const prioritySpan = maxLevel + 1

  for (const key of keys) {
    const list = [...(bucket.get(key) ?? [])].sort(
      (a, b) => a.position - b.position || a.id - b.id,
    )
    const gOrder = key == null ? ungroupedRank : (groupOrder.get(key) ?? ungroupedRank)
    // 序号越小越靠前：反转成正向权重（未分组固定最低，排在所有分组之后）。
    const groupWeight =
      key == null
        ? 0
        : Math.max(1, groupCount - gOrder + 1)
    const taskCount = list.length
    list.forEach((task, index) => {
      const tOrder = index + 1
      const taskWeight = Math.max(1, taskCount - tOrder + 1)
      const level = priorityById(priorities, task.priority)?.level ?? 0
      const surface = paint(task)
      items.push({
        id: task.id,
        title: task.title,
        score:
          groupWeight * taskSpan * prioritySpan +
          taskWeight * prioritySpan +
          level,
        groupOrder: gOrder,
        taskOrder: tOrder,
        priorityLevel: level,
        groupName: task.group?.name ?? UNGROUPED_NAME,
        priorityName:
          priorityById(priorities, task.priority)?.name ?? `P${task.priority}`,
        surfaceClass: surface.className,
        surfaceStyle: surface.style,
      })
    })
  }

  return items.sort((a, b) => b.score - a.score || a.id - b.id)
}

export interface MindMapTooltipMeta {
  task: Task
  status?: Status
  priorityName?: string
}

export function formatTaskTooltip({
  task,
  status,
  priorityName,
}: MindMapTooltipMeta): string {
  const priority = priorityName ?? `优先级 ${task.priority}`
  const statusName = status?.name ?? '未分配'
  const overdue = dueState(task.due_date, task.completed_at != null) === 'overdue'
  const due = task.due_date
    ? `${formatDue(task.due_date)}${overdue ? '（已逾期）' : ''}`
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
  priorities: Priority[],
  idPrefix: string,
): EChartsTreeNode[] {
  return groups.map((group) => ({
    id: `${idPrefix}priority-${group.priority}`,
    name: longLabel(priorities, group.priority),
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
  priorities: Priority[],
  idPrefix: string,
): EChartsTreeNode[] {
  return groups.map((group) => ({
    id: `${idPrefix}priority-${group.priority}`,
    name: longLabel(priorities, group.priority),
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
  priorities: Priority[],
  palette: ChartPalette,
  groupBy = false,
): EChartsTreeNode {
  const children = groupBy
    ? groupSections(tasks, statuses, priorities).map((section) => ({
        id: `group-${section.id ?? 'none'}`,
        name: section.name,
        value: section.count,
        itemStyle: { color: section.color },
        symbolSize: 12,
        lineStyle: { color: withAlpha(section.color, 0.55) },
        children: priorityNodes(
          section.priorities,
          palette,
          priorities,
          `group-${section.id ?? 'none'}-`,
        ),
      }))
    : priorityNodes(groupTasks(tasks, statuses, priorities), palette, priorities, '')

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
  priorities: Priority[],
  palette: ChartPalette,
  groupBy = false,
): EChartsTreeNode[] {
  const children = groupBy
    ? groupSections(tasks, statuses, priorities).map((section) => ({
        id: `group-${section.id ?? 'none'}`,
        name: section.name,
        value: section.count,
        itemStyle: { color: section.color },
        children: sunburstPriorityNodes(
          section.priorities,
          palette,
          priorities,
          `group-${section.id ?? 'none'}-`,
        ),
      }))
    : sunburstPriorityNodes(
        groupTasks(tasks, statuses, priorities),
        palette,
        priorities,
        '',
      )

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
  priorities: Priority[],
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
        display: `${shortLabel(priorities, group.priority)}优先级 · ${groupDone}/${group.count}`,
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
    for (const section of groupSections(tasks, statuses, priorities)) {
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
    emitPriorities(groupTasks(tasks, statuses, priorities), rootName, 1, '')
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

export function buildSwimlaneData(
  tasks: Task[],
  statuses: Status[],
  priorities: Priority[],
): SwimlaneData {
  const groups = groupTasks(tasks, statuses, priorities)
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
