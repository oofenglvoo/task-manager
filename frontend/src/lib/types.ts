export interface Project {
  id: number
  name: string
  description: string | null
  color: string
  position: number
  is_archived: boolean
  task_count: number
  created_at: string
  updated_at: string
}

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

export interface SubTask {
  id: number
  task_id: number
  title: string
  is_done: boolean
  position: number
}

export interface Task {
  id: number
  project_id: number
  status_id: number | null
  title: string
  description: string | null
  priority: number
  due_date: string | null
  position: number
  is_archived: boolean
  created_at: string
  updated_at: string
  completed_at: string | null
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
  project_id: number
  status_id?: number | null
  description?: string | null
  priority?: number
  due_date?: string | null
  tag_ids?: number[]
}

export interface TaskQuery {
  project_id?: number
  status_id?: number
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
  background_url: string | null
}

export interface ImportResult {
  projects: number
  statuses: number
  tags: number
  tasks: number
  subtasks: number
}
