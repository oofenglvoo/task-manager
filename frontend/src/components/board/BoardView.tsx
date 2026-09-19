import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
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
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { LayoutGrid, Layers, Plus, Rows3, Settings2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Task, TaskQuery } from '../../lib/types'
import {
  useReorderTasks,
  useStatuses,
  useTasks,
  useUpdateTask,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { useUI } from '../../store/ui'
import { CARD_SIZE_STYLES, usePreferences } from '../../store/preferences'
import type { CardSize } from '../../store/preferences'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Select } from '../ui/Input'
import { TaskCard } from '../tasks/TaskCard'
import { TaskCardSkeleton } from '../tasks/TaskCardSkeleton'
import { GroupedTaskBoard } from './GroupedTaskBoard'
import type { TaskSection } from './GroupedTaskBoard'
import { TaskMindMap } from './TaskMindMap'
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

const PAGE_SIZE = 60

export function BoardView() {
  const { search, priority, tagId, openCreate, openGroups } = useUI()
  const { cardSize, compact, groupBy, setCardSize, setCompact, setGroupBy } = usePreferences()
  const { data: statuses = [] } = useStatuses()
  const reorderTasks = useReorderTasks()
  const updateTask = useUpdateTask()
  const { push } = useToast()

  const [sortValue, setSortValue] = useState('position')
  const [statusFilter, setStatusFilter] = useState<number | ''>('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const style = CARD_SIZE_STYLES[cardSize]
  const option = SORT_OPTIONS.find((item) => item.value === sortValue) ?? SORT_OPTIONS[0]
  const manualOrder = sortValue === 'position'

  const query = useMemo<TaskQuery>(
    () => ({
      status_id: statusFilter === '' ? undefined : statusFilter,
      priority: priority ?? undefined,
      tag_id: tagId ?? undefined,
      q: search || undefined,
      sort: option.sort,
      order: option.order,
    }),
    [statusFilter, priority, tagId, search, option.sort, option.order],
  )

  const { data: tasks = [], isLoading } = useTasks(query)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query])

  const statusMap = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses],
  )

  const doneStatus = statuses.find((item) => item.is_done)
  const openStatus = statuses.find((item) => !item.is_done)
  const truncated = visibleCount < tasks.length
  const dragEnabled = manualOrder && !truncated
  const visibleTasks = truncated ? tasks.slice(0, visibleCount) : tasks

  const sections = useMemo<TaskSection[]>(() => {
    if (!groupBy) return []
    const map = new Map<string, TaskSection>()
    for (const task of visibleTasks) {
      const key = task.group ? `g-${task.group.id}` : 'none'
      let section = map.get(key)
      if (!section) {
        section = {
          key,
          groupId: task.group?.id ?? null,
          name: task.group?.name ?? '未分组',
          color: task.group?.color ?? null,
          tasks: [],
        }
        map.set(key, section)
      }
      section.tasks.push(task)
    }
    const list = [...map.values()]
    list.sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : 0))
    return list
  }, [groupBy, visibleTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  function changeStatus(taskId: number, statusId: number | null) {
    updateTask.mutate({ id: taskId, data: { status_id: statusId } }, { onError })
  }

  function changePriority(taskId: number, value: number) {
    updateTask.mutate({ id: taskId, data: { priority: value } }, { onError })
  }

  function toggleDone(task: Task) {
    if (task.completed_at != null) {
      if (openStatus) changeStatus(task.id, openStatus.id)
    } else if (doneStatus) {
      changeStatus(task.id, doneStatus.id)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = visibleTasks.map((task) => task.id)
    const from = ids.indexOf(Number(active.id))
    const to = ids.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    reorderTasks.mutate(arrayMove(ids, from, to), { onError })
  }

  const activeTask =
    activeId != null ? visibleTasks.find((task) => task.id === activeId) : undefined

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <TaskMindMap />
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink">任务</span>
        <span className="text-xs text-muted">{tasks.length}</span>
        {!dragEnabled && manualOrder && truncated ? (
          <span className="text-xs text-muted">（已加载 {visibleTasks.length} 条，拖拽已暂停）</span>
        ) : null}
        {!manualOrder ? (
          <span className="text-xs text-muted">（切换「手动排序」后可拖拽）</span>
        ) : groupBy ? (
          <span className="text-xs text-muted">（同组拖拽排序，跨组拖拽迁移分组）</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={groupBy ? '切换为不分组' : '按分组查看'}
            title={groupBy ? '不分组' : '按分组'}
            onClick={() => setGroupBy(!groupBy)}
            className={
              'rounded border p-1.5 transition-colors ' +
              (groupBy
                ? 'border-accent/60 bg-accent-soft text-ink'
                : 'border-line text-ink-soft hover:border-line-strong hover:text-ink')
            }
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="管理分组"
            title="管理分组"
            onClick={() => openGroups()}
            className="rounded border border-line p-1.5 text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={compact ? '切换为宽松显示' : '切换为紧凑显示'}
            title={compact ? '宽松显示' : '紧凑显示'}
            onClick={() => setCompact(!compact)}
            className="rounded border border-line p-1.5 text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            {compact ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </button>
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
        <div className="p-4">
          <div
            className={`grid ${style.gap}`}
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${style.min}, 1fr))`,
            }}
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <TaskCardSkeleton key={index} />
            ))}
          </div>
        </div>
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
        <div className="p-4">
          {groupBy ? (
            <GroupedTaskBoard
              sections={sections}
              statuses={statuses}
              statusMap={statusMap}
              style={style}
              compact={compact}
              dragEnabled={dragEnabled}
              onChangeStatus={changeStatus}
              onChangePriority={changePriority}
              onToggleDone={toggleDone}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visibleTasks.map((task) => task.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  className={`grid ${style.gap}`}
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${style.min}, 1fr))`,
                  }}
                >
                  {visibleTasks.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      status={
                        task.status_id != null ? statusMap.get(task.status_id) : undefined
                      }
                      statuses={statuses}
                      style={style}
                      compact={compact}
                      disabled={!dragEnabled}
                      onStatusChange={changeStatus}
                      onPriorityChange={changePriority}
                      onToggleDone={toggleDone}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeTask ? (
                  <div className="w-72 rotate-2 opacity-90">
                    <TaskCard
                      task={activeTask}
                      status={
                        activeTask.status_id != null
                          ? statusMap.get(activeTask.status_id)
                          : undefined
                      }
                      style={style}
                      compact={compact}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {truncated ? (
            <div className="mt-4 flex justify-center">
              <Button
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                显示更多（还有 {tasks.length - visibleTasks.length} 条）
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
