import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { TaskQuery } from '../../lib/types'
import {
  useReorderTasks,
  useStatuses,
  useTasks,
  useUpdateTask,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { useUI } from '../../store/ui'
import { CARD_SIZE_MIN, usePreferences } from '../../store/preferences'
import type { CardSize } from '../../store/preferences'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Select } from '../ui/Input'
import { LoadingBlock } from '../ui/Spinner'
import { TaskCard } from '../tasks/TaskCard'
import { SortableTaskCard } from './SortableTaskCard'

const SORT_OPTIONS: Array<{
  value: string
  label: string
  sort: string
  order: 'asc' | 'desc'
}> = [
  { value: 'position', label: '手动排序', sort: 'position', order: 'asc' },
  { value: 'priority', label: '优先级', sort: 'priority', order: 'desc' },
  { value: 'due_date', label: '截止日期', sort: 'due_date', order: 'asc' },
  { value: 'created_at', label: '创建时间', sort: 'created_at', order: 'desc' },
]

const SIZE_OPTIONS: Array<{ value: CardSize; label: string }> = [
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'lg', label: '大' },
]

export function BoardView() {
  const { projectId, search, priority, tagId, openCreate } = useUI()
  const { cardSize, setCardSize } = usePreferences()
  const { data: statuses = [] } = useStatuses()
  const reorderTasks = useReorderTasks()
  const updateTask = useUpdateTask()
  const { push } = useToast()

  const [sortValue, setSortValue] = useState('position')
  const [statusFilter, setStatusFilter] = useState<number | ''>('')
  const [activeId, setActiveId] = useState<number | null>(null)

  const option = SORT_OPTIONS.find((item) => item.value === sortValue) ?? SORT_OPTIONS[0]
  const manualOrder = sortValue === 'position'

  const query = useMemo<TaskQuery>(
    () => ({
      project_id: projectId ?? undefined,
      status_id: statusFilter === '' ? undefined : statusFilter,
      priority: priority ?? undefined,
      tag_id: tagId ?? undefined,
      q: search || undefined,
      sort: option.sort,
      order: option.order,
    }),
    [projectId, statusFilter, priority, tagId, search, option.sort, option.order],
  )

  const { data: tasks = [], isLoading } = useTasks(query)

  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  function changeStatus(taskId: number, statusId: number | null) {
    updateTask.mutate({ id: taskId, data: { status_id: statusId } }, { onError })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = tasks.map((task) => task.id)
    const from = ids.indexOf(Number(active.id))
    const to = ids.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    reorderTasks.mutate(arrayMove(ids, from, to), { onError })
  }

  const activeTask = activeId != null ? tasks.find((task) => task.id === activeId) : undefined

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink">任务</span>
        <span className="text-xs text-muted">{tasks.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={cardSize}
            className="w-24"
            aria-label="卡片大小"
            onChange={(event) => setCardSize(event.target.value as CardSize)}
          >
            {SIZE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            className="w-32"
            aria-label="状态筛选"
            onChange={(event) =>
              setStatusFilter(
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
          >
            <option value="">全部状态</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </Select>
          <Select
            value={sortValue}
            className="w-32"
            aria-label="排序方式"
            onChange={(event) => setSortValue(event.target.value)}
          >
            {SORT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : tasks.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="还没有任务"
            description="创建第一个任务，它会以卡片形式出现在这里。"
            action={
              <Button variant="primary" size="sm" onClick={() => openCreate()}>
                <Plus className="h-3.5 w-3.5" />
                新建任务
              </Button>
            }
          />
        </div>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_SIZE_MIN[cardSize]}, 1fr))`,
                }}
              >
                {tasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    status={task.status_id != null ? statusMap.get(task.status_id) : undefined}
                    statuses={statuses}
                    onStatusChange={changeStatus}
                    disabled={!manualOrder}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeTask ? (
                <div className="w-64 rotate-2 opacity-90">
                  <TaskCard
                    task={activeTask}
                    status={
                      activeTask.status_id != null
                        ? statusMap.get(activeTask.status_id)
                        : undefined
                    }
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  )
}
