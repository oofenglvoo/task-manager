export interface Status {
  id: number
  name: string
  color: string
  is_done: boolean
  position: number
}

export interface Tag {
  id: number
  name: string
  color: string
}

export interface Group {
  id: number
  name: string
  color: string
  position: number
  task_count: number
}

export interface SubTask {
  id: number
  task_id: number
  title: string
  is_done: boolean
  position: number
}

export interface TaskHistorySnapshot {
  title: string
  status_name: string | null
  group_name: string | null
  priority: number
  due_date: string | null
  tag_names: string[]
  description: string | null
}

export interface TaskHistory {
  id: number
  created_at: string
  snapshot: TaskHistorySnapshot
}

export interface Task {
  id: number
  status_id: number | null
  group_id: number | null
  title: string
  description: string | null
  priority: number
  due_date: string | null
  position: number
  is_archived: boolean
  created_at: string
  updated_at: string
  completed_at: string | null
  group: Group | null
  tags: Tag[]
  subtasks: SubTask[]
}

export interface StatusStat {
  status_id: number | null
  name: string
  color: string
  is_done: boolean
  count: number
}

export interface PriorityStat {
  priority: number
  count: number
}

export interface Stats {
  total: number
  active: number
  archived: number
  completed: number
  completion_rate: number
  overdue: number
  due_soon: number
  by_status: StatusStat[]
  by_priority: PriorityStat[]
}

export interface TaskInput {
  title: string
  status_id?: number | null
  group_id?: number | null
  description?: string | null
  priority?: number
  due_date?: string | null
  tag_ids?: number[]
}

export interface TaskQuery {
  status_id?: number
  group_id?: number
  ungrouped?: boolean
  priority?: number
  tag_id?: number
  q?: string
  archived?: boolean
  sort?: string
  order?: 'asc' | 'desc'
}

export type ThemeMode = 'dark' | 'light' | 'system'
export type CardSize = 'sm' | 'md' | 'lg'

export interface Preferences {
  theme: ThemeMode
  card_size: CardSize
  compact: boolean
  group_by: boolean
  background_url: string | null
}

export interface ImportResult {
  statuses: number
  tags: number
  groups: number
  tasks: number
  subtasks: number
}
