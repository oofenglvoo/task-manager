import type {
  ImportResult,
  Preferences,
  Project,
  Stats,
  Status,
  SubTask,
  Tag,
  Task,
  TaskInput,
  TaskQuery,
} from './types'

const BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Body = object

async function toError(res: Response): Promise<ApiError> {
  let message = res.statusText || `请求失败 (${res.status})`
  try {
    const data = (await res.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') message = data.detail
    else if (data.detail) message = JSON.stringify(data.detail)
  } catch {
    message = message || `请求失败 (${res.status})`
  }
  return new ApiError(res.status, message)
}

async function request<T>(path: string, method = 'GET', body?: Body): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form })
  if (!res.ok) throw await toError(res)
  return (await res.json()) as T
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return '操作失败'
}

function qs(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

export const api = {
  projects: {
    list: (archived = false) => request<Project[]>(`/api/projects${qs({ archived })}`),
    create: (data: { name: string; description?: string | null; color?: string }) =>
      request<Project>('/api/projects', 'POST', data),
    update: (
      id: number,
      data: Partial<{ name: string; description: string | null; color: string }>,
    ) => request<Project>(`/api/projects/${id}`, 'PUT', data),
    remove: (id: number) => request<void>(`/api/projects/${id}`, 'DELETE'),
    archive: (id: number, isArchived = true) =>
      request<Project>(`/api/projects/${id}/archive`, 'POST', { is_archived: isArchived }),
    reorder: (orderedIds: number[]) =>
      request<void>('/api/projects/reorder', 'PUT', { ordered_ids: orderedIds }),
  },
  statuses: {
    list: () => request<Status[]>('/api/statuses'),
    create: (data: { name: string; color?: string; is_done?: boolean }) =>
      request<Status>('/api/statuses', 'POST', data),
    update: (
      id: number,
      data: Partial<{ name: string; color: string; is_done: boolean }>,
    ) => request<Status>(`/api/statuses/${id}`, 'PUT', data),
    remove: (id: number) => request<void>(`/api/statuses/${id}`, 'DELETE'),
    reorder: (orderedIds: number[]) =>
      request<void>('/api/statuses/reorder', 'PUT', { ordered_ids: orderedIds }),
  },
  tags: {
    list: () => request<Tag[]>('/api/tags'),
    create: (data: { name: string; color?: string }) =>
      request<Tag>('/api/tags', 'POST', data),
    update: (id: number, data: Partial<{ name: string; color: string }>) =>
      request<Tag>(`/api/tags/${id}`, 'PUT', data),
    remove: (id: number) => request<void>(`/api/tags/${id}`, 'DELETE'),
  },
  tasks: {
    list: (query: TaskQuery = {}) => request<Task[]>(`/api/tasks${qs(query)}`),
    get: (id: number) => request<Task>(`/api/tasks/${id}`),
    create: (data: TaskInput) => request<Task>('/api/tasks', 'POST', data),
    update: (id: number, data: Partial<TaskInput> & { position?: number }) =>
      request<Task>(`/api/tasks/${id}`, 'PUT', data),
    remove: (id: number) => request<void>(`/api/tasks/${id}`, 'DELETE'),
    move: (
      id: number,
      data: { project_id?: number; status_id?: number; position?: number },
    ) => request<Task>(`/api/tasks/${id}/move`, 'PUT', data),
    reorder: (orderedIds: number[]) =>
      request<void>('/api/tasks/reorder', 'PUT', { ordered_ids: orderedIds }),
    archive: (id: number, isArchived = true) =>
      request<Task>(`/api/tasks/${id}/archive`, 'POST', { is_archived: isArchived }),
  },
  subtasks: {
    list: (taskId: number) => request<SubTask[]>(`/api/tasks/${taskId}/subtasks`),
    create: (taskId: number, title: string) =>
      request<SubTask>(`/api/tasks/${taskId}/subtasks`, 'POST', { title }),
    update: (
      taskId: number,
      id: number,
      data: Partial<{ title: string; is_done: boolean }>,
    ) => request<SubTask>(`/api/tasks/${taskId}/subtasks/${id}`, 'PUT', data),
    remove: (taskId: number, id: number) =>
      request<void>(`/api/tasks/${taskId}/subtasks/${id}`, 'DELETE'),
  },
  stats: {
    get: (projectId?: number) =>
      request<Stats>(`/api/stats${qs({ project_id: projectId })}`),
  },
  settings: {
    get: () => request<Preferences>('/api/settings'),
    update: (data: Partial<Preferences>) =>
      request<Preferences>('/api/settings', 'PUT', data),
  },
  backgrounds: {
    upload: (file: Blob, filename: string) => {
      const form = new FormData()
      form.append('file', file, filename)
      return requestForm<{ url: string }>('/api/backgrounds', form)
    },
    remove: (url: string) => {
      const name = url.split('/').pop() ?? ''
      return request<void>(`/api/backgrounds/${name}`, 'DELETE')
    },
  },
  data: {
    exportAll: () => request<Record<string, unknown>>('/api/export'),
    importAll: (payload: Record<string, unknown>) =>
      request<ImportResult>('/api/import', 'POST', payload),
  },
}
