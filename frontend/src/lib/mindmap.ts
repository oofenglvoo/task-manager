import type { Status, Task } from './types'

export const PRIORITY_LEVELS = [3, 2, 1] as const

export const PRIORITY_WEIGHT: Record<number, number> = { 1: 1, 2: 2, 3: 3 }

// 综合评分：优先级权重与最近更新时间权重的占比。
export const PRIORITY_FACTOR = 1
export const RECENCY_FACTOR = 1

// 每个「优先级 → 状态」分支最多展开的任务节点数。
export const BRANCH_LIMIT = 8

export const NODE_HEIGHT = 34
export const TASK_NODE_HEIGHT = 40
export const NODE_GAP = 12
export const BRANCH_GAP = 26
export const COLUMN_GAP = 56
export const ROOT_WIDTH = 132
export const PRIORITY_WIDTH = 108
export const STATUS_WIDTH = 128
export const TASK_WIDTH = 224

export type MindMapNodeType = 'root' | 'priority' | 'status' | 'task' | 'more'

export interface MindMapNode {
  id: string
  type: MindMapNodeType
  label: string
  sublabel?: string
  x: number
  y: number
  width: number
  height: number
  color?: string
  priority?: number
  statusId?: number | null
  taskId?: number
  done?: boolean
  count?: number
  hiddenCount?: number
}

export interface MindMapLink {
  id: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  color?: string
  dashed?: boolean
  rootId: string
}

export interface MindMapLayout {
  nodes: MindMapNode[]
  links: MindMapLink[]
  width: number
  height: number
}

export function priorityLabel(priority: number): string {
  if (priority >= 3) return '高优先级'
  if (priority === 2) return '中优先级'
  return '低优先级'
}

export function priorityColor(priority: number): string {
  if (priority >= 3) return 'rgb(var(--c-priority-high))'
  if (priority === 2) return 'rgb(var(--c-priority-medium))'
  return 'rgb(var(--c-priority-low))'
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

interface Branch {
  statusId: number | null
  name: string
  color: string
  tasks: Task[]
  hidden: number
}

interface PriorityGroup {
  priority: number
  branches: Branch[]
  count: number
}

function groupTasks(tasks: Task[], statuses: Status[]): PriorityGroup[] {
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

export function buildMindMap(tasks: Task[], statuses: Status[]): MindMapLayout {
  const groups = groupTasks(tasks, statuses)
  const nodes: MindMapNode[] = []
  const links: MindMapLink[] = []

  const rootHeight = 48
  let cursorY = 0
  const rootId = 'root'
  const columnX = [
    0,
    ROOT_WIDTH + COLUMN_GAP,
    ROOT_WIDTH + COLUMN_GAP + PRIORITY_WIDTH + COLUMN_GAP,
    ROOT_WIDTH + COLUMN_GAP + PRIORITY_WIDTH + COLUMN_GAP + STATUS_WIDTH + COLUMN_GAP,
  ]

  const groupLayouts = groups.map((group) => {
    const branchLayouts = group.branches.map((branch) => {
      const taskNodes = branch.tasks.map((task, index) => ({
        task,
        y: cursorY + index * (TASK_NODE_HEIGHT + NODE_GAP),
        height: TASK_NODE_HEIGHT,
      }))
      let branchEnd = cursorY
      if (taskNodes.length > 0) {
        const last = taskNodes[taskNodes.length - 1]
        branchEnd = last.y + last.height
      }
      const moreOffset = branch.hidden > 0 ? TASK_NODE_HEIGHT + NODE_GAP : 0
      const contentTop = cursorY
      const contentBottom = branchEnd + moreOffset
      const branchCenter = (contentTop + contentBottom) / 2

      cursorY = contentBottom + BRANCH_GAP

      return { branch, taskNodes, center: branchCenter }
    })

    let groupTop = Infinity
    let groupBottom = -Infinity
    for (const layout of branchLayouts) {
      groupTop = Math.min(groupTop, layout.center - NODE_HEIGHT / 2)
      groupBottom = Math.max(groupBottom, layout.center + NODE_HEIGHT / 2)
    }
    const groupCenter = branchLayouts.length
      ? (groupTop + groupBottom) / 2
      : rootHeight / 2
    return { group, branchLayouts, center: groupCenter }
  })

  let contentTop = Infinity
  let contentBottom = -Infinity
  for (const layout of groupLayouts) {
    for (const branch of layout.branchLayouts) {
      contentTop = Math.min(contentTop, branch.center - NODE_HEIGHT / 2)
      contentBottom = Math.max(contentBottom, branch.center + NODE_HEIGHT / 2)
    }
  }
  if (!Number.isFinite(contentTop)) {
    contentTop = 0
    contentBottom = rootHeight
  }

  // 任务节点从 cursorY=0 开始铺排，而分支中心可能更低，因此任务上图时会越过 0。
  // 这里统一把「所有实际矩形」纳入边界，保证整体内容非负。
  let minTop = contentTop
  let maxBottom = contentBottom
  for (const layout of groupLayouts) {
    for (const branch of layout.branchLayouts) {
      for (const item of branch.taskNodes) {
        minTop = Math.min(minTop, item.y)
        maxBottom = Math.max(maxBottom, item.y + item.height + NODE_GAP)
      }
    }
  }
  const offsetY = -minTop
  const rootCenter = (offsetY + minTop + offsetY + maxBottom) / 2

  nodes.push({
    id: rootId,
    type: 'root',
    label: '全部任务',
    sublabel: `${tasks.length} 个任务`,
    x: columnX[0],
    y: rootCenter - rootHeight / 2,
    width: ROOT_WIDTH,
    height: rootHeight,
    count: tasks.length,
  })

  for (const { group, branchLayouts } of groupLayouts) {
    const priorityId = `priority-${group.priority}`
    const priorityY = branchLayouts.reduce(
      (sum, layout) => sum + layout.center,
      0,
    ) / (branchLayouts.length || 1)

    nodes.push({
      id: priorityId,
      type: 'priority',
      label: priorityLabel(group.priority),
      sublabel: `${group.count} 个`,
      x: columnX[1],
      y: priorityY + offsetY - NODE_HEIGHT / 2,
      width: PRIORITY_WIDTH,
      height: NODE_HEIGHT,
      color: priorityColor(group.priority),
      priority: group.priority,
      count: group.count,
    })
    links.push({
      id: `${rootId}->${priorityId}`,
      from: { x: columnX[0] + ROOT_WIDTH, y: rootCenter },
      to: { x: columnX[1], y: priorityY + offsetY },
      color: priorityColor(group.priority),
      rootId: priorityId,
    })

    branchLayouts.forEach(({ branch, taskNodes, center: branchCenter }) => {
      const statusId = `status-${group.priority}-${branch.statusId ?? 'none'}`
      const statusY = branchCenter + offsetY

      nodes.push({
        id: statusId,
        type: 'status',
        label: branch.name,
        sublabel: `${branch.tasks.length + branch.hidden} 个`,
        x: columnX[2],
        y: statusY - NODE_HEIGHT / 2,
        width: STATUS_WIDTH,
        height: NODE_HEIGHT,
        color: branch.color,
        priority: group.priority,
        statusId: branch.statusId,
        count: branch.tasks.length + branch.hidden,
      })
      links.push({
        id: `${priorityId}->${statusId}`,
        from: { x: columnX[1] + PRIORITY_WIDTH, y: priorityY + offsetY },
        to: { x: columnX[2], y: statusY },
        color: branch.color,
        rootId: priorityId,
      })

      taskNodes.forEach(({ task, y, height }) => {
        const taskNodeId = `task-${task.id}`
        const nodeY = y + offsetY
        nodes.push({
          id: taskNodeId,
          type: 'task',
          label: task.title,
          sublabel: undefined,
          x: columnX[3],
          y: nodeY,
          width: TASK_WIDTH,
          height,
          color: priorityColor(task.priority),
          priority: task.priority,
          statusId: task.status_id,
          taskId: task.id,
          done: task.completed_at != null,
        })
        links.push({
          id: `${statusId}->${taskNodeId}`,
          from: { x: columnX[2] + STATUS_WIDTH, y: statusY },
          to: { x: columnX[3], y: nodeY + height / 2 },
          color: branch.color,
          rootId: priorityId,
        })
      })

      if (branch.hidden > 0) {
        const last = taskNodes[taskNodes.length - 1]
        const moreY = last
          ? last.y + last.height + NODE_GAP
          : branchCenter
        const moreId = `more-${group.priority}-${branch.statusId ?? 'none'}`
        nodes.push({
          id: moreId,
          type: 'more',
          label: `还有 ${branch.hidden} 个…`,
          x: columnX[3],
          y: moreY + offsetY,
          width: TASK_WIDTH,
          height: NODE_HEIGHT,
          color: branch.color,
          priority: group.priority,
          statusId: branch.statusId,
          hiddenCount: branch.hidden,
        })
        links.push({
          id: `${statusId}->${moreId}`,
          from: { x: columnX[2] + STATUS_WIDTH, y: statusY },
          to: { x: columnX[3], y: moreY + offsetY + NODE_HEIGHT / 2 },
          color: branch.color,
          dashed: true,
          rootId: priorityId,
        })
      }
    })
  }

  const width = columnX[3] + TASK_WIDTH
  const height = Math.max(maxBottom - minTop, rootHeight) + NODE_GAP

  return { nodes, links, width, height }
}
