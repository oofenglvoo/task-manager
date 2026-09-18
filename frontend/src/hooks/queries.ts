import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { TaskInput, TaskQuery } from '../lib/types'

export const keys = {
  projects: (archived = false) => ['projects', archived] as const,
  statuses: ['statuses'] as const,
  tags: ['tags'] as const,
  tasks: (query: TaskQuery) => ['tasks', query] as const,
  task: (id: number) => ['task', id] as const,
  stats: (projectId?: number) => ['stats', projectId ?? 'all'] as const,
}

export function useProjects(archived = false) {
  return useQuery({
    queryKey: keys.projects(archived),
    queryFn: () => api.projects.list(archived),
  })
}

export function useStatuses() {
  return useQuery({ queryKey: keys.statuses, queryFn: () => api.statuses.list() })
}

export function useTags() {
  return useQuery({ queryKey: keys.tags, queryFn: () => api.tags.list() })
}

export function useTasks(query: TaskQuery) {
  return useQuery({
    queryKey: keys.tasks(query),
    queryFn: () => api.tasks.list(query),
  })
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: keys.task(id ?? 0),
    queryFn: () => api.tasks.get(id as number),
    enabled: id != null,
  })
}

export function useStats(projectId?: number) {
  return useQuery({
    queryKey: keys.stats(projectId),
    queryFn: () => api.stats.get(projectId),
  })
}

function useInvalidateTasks() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['tasks'] })
    void qc.invalidateQueries({ queryKey: ['task'] })
    void qc.invalidateQueries({ queryKey: ['stats'] })
    void qc.invalidateQueries({ queryKey: ['projects'] })
  }
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (data: TaskInput) => api.tasks.create(data),
    onSuccess: invalidate,
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<TaskInput> & { position?: number }
    }) => api.tasks.update(id, data),
    onSuccess: (task) => {
      qc.setQueryData(keys.task(task.id), task)
      invalidate()
    },
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: number) => api.tasks.remove(id),
    onSuccess: invalidate,
  })
}

export function useMoveTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: { project_id?: number; status_id?: number; position?: number }
    }) => api.tasks.move(id, data),
    onSuccess: invalidate,
  })
}

export function useReorderTasks() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (orderedIds: number[]) => api.tasks.reorder(orderedIds),
    onSuccess: invalidate,
  })
}

export function useArchiveTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: ({ id, isArchived }: { id: number; isArchived: boolean }) =>
      api.tasks.archive(id, isArchived),
    onSuccess: invalidate,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null; color?: string }) =>
      api.projects.create(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<{ name: string; description: string | null; color: string }>
    }) => api.projects.update(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.projects.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isArchived }: { id: number; isArchived: boolean }) =>
      api.projects.archive(id, isArchived),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useReorderProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: number[]) => api.projects.reorder(orderedIds),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useCreateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; is_done?: boolean }) =>
      api.statuses.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['statuses'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<{ name: string; color: string; is_done: boolean }>
    }) => api.statuses.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['statuses'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useDeleteStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.statuses.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['statuses'] }),
  })
}

export function useReorderStatuses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: number[]) => api.statuses.reorder(orderedIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['statuses'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => api.tags.create(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<{ name: string; color: string }>
    }) => api.tags.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tags'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.tags.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tags'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: number; title: string }) =>
      api.subtasks.create(taskId, title),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['task', vars.taskId] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      id,
      data,
    }: {
      taskId: number
      id: number
      data: Partial<{ title: string; is_done: boolean }>
    }) => api.subtasks.update(taskId, id, data),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['task', vars.taskId] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, id }: { taskId: number; id: number }) =>
      api.subtasks.remove(taskId, id),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['task', vars.taskId] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
