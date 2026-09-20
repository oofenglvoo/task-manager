import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { TaskInput, TaskQuery } from '../lib/types'

export const keys = {
  statuses: ['statuses'] as const,
  tags: ['tags'] as const,
  groups: ['groups'] as const,
  priorities: ['priorities'] as const,
  tasks: (query: TaskQuery) => ['tasks', query] as const,
  task: (id: number) => ['task', id] as const,
  history: (id: number) => ['history', id] as const,
  stats: ['stats'] as const,
  holidays: (year: number) => ['holidays', year] as const,
}

export function useStatuses() {
  return useQuery({ queryKey: keys.statuses, queryFn: () => api.statuses.list() })
}

export function usePriorities() {
  return useQuery({ queryKey: keys.priorities, queryFn: () => api.priorities.list() })
}

export function useTags() {
  return useQuery({ queryKey: keys.tags, queryFn: () => api.tags.list() })
}

export function useGroups() {
  return useQuery({ queryKey: keys.groups, queryFn: () => api.groups.list() })
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

export function useTaskHistory(id: number | null) {
  return useQuery({
    queryKey: keys.history(id ?? 0),
    queryFn: () => api.tasks.history(id as number),
    enabled: id != null,
  })
}

export function useDeleteTaskHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, historyId }: { taskId: number; historyId: number }) =>
      api.tasks.removeHistory(taskId, historyId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: keys.history(vars.taskId) })
    },
  })
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => api.stats.get() })
}

export function useHolidays(year: number) {
  return useQuery({
    queryKey: keys.holidays(year),
    queryFn: () => api.holidays.get(year),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  })
}

function useInvalidateTasks() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['tasks'] })
    void qc.invalidateQueries({ queryKey: ['task'] })
    void qc.invalidateQueries({ queryKey: ['history'] })
    void qc.invalidateQueries({ queryKey: ['stats'] })
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
      data: { status_id?: number; group_id?: number | null; position?: number }
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

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; note?: string | null }) =>
      api.groups.create(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<{ name: string; color: string; note: string | null }>
    }) => api.groups.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useReorderGroups() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: number[]) => api.groups.reorder(orderedIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.groups.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useCreatePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string; level?: number }) =>
      api.priorities.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['priorities'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useUpdatePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<{ name: string; color: string; level: number }>
    }) => api.priorities.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['priorities'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useDeletePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.priorities.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['priorities'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useReorderPriorities() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: number[]) => api.priorities.reorder(orderedIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['priorities'] })
      void qc.invalidateQueries({ queryKey: ['stats'] })
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
