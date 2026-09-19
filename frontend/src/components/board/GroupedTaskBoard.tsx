import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import type { CardSizeStyle } from '../../store/preferences'
import type { Status, Task } from '../../lib/types'
import { errorMessage } from '../../lib/api'
import { useMoveTask, useReorderTasks } from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { TaskCard } from '../tasks/TaskCard'
import { SortableTaskCard } from './SortableTaskCard'

export interface TaskSection {
  key: string
  groupId: number | null
  name: string
  color: string | null
  tasks: Task[]
}

interface GroupedTaskBoardProps {
  sections: TaskSection[]
  statuses: Status[]
  statusMap: Map<number, Status>
  style: CardSizeStyle
  compact: boolean
  dragEnabled: boolean
  onChangeStatus: (taskId: number, statusId: number | null) => void
  onChangePriority: (taskId: number, priority: number) => void
  onToggleDone: (task: Task) => void
  onToggleSubtask: (taskId: number, subtaskId: number, isDone: boolean) => void
}

type Groups = Record<string, number[]>

export function GroupedTaskBoard({
  sections,
  statuses,
  statusMap,
  style,
  compact,
  dragEnabled,
  onChangeStatus,
  onChangePriority,
  onToggleDone,
  onToggleSubtask,
}: GroupedTaskBoardProps) {
  const reorderTasks = useReorderTasks()
  const moveTask = useMoveTask()
  const { push } = useToast()
  const [activeId, setActiveId] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  const activeTask =
    activeId != null
      ? sections.flatMap((section) => section.tasks).find((task) => task.id === activeId)
      : undefined

  function groupsFromSections(): Groups {
    const result: Groups = {}
    for (const section of sections) {
      result[section.key] = section.tasks.map((task) => task.id)
    }
    return result
  }

  function findSectionKey(taskId: number): string | null {
    for (const section of sections) {
      if (section.tasks.some((task) => task.id === taskId)) return section.key
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeTaskId = Number(active.id)
    const sourceKey = findSectionKey(activeTaskId)
    if (sourceKey == null) return

    // 落点可能是任务卡，也可能是分组容器本体。
    const overId = String(over.id)
    let targetKey: string | null = null
    let overTaskId: number | null = null
    if (overId.startsWith('section:')) {
      targetKey = overId.slice('section:'.length)
    } else {
      overTaskId = Number(over.id)
      targetKey = findSectionKey(overTaskId)
    }
    if (targetKey == null) return

    const groups = groupsFromSections()
    const sourceList = groups[sourceKey] ?? []
    const from = sourceList.indexOf(activeTaskId)
    if (from < 0) return

    if (targetKey === sourceKey) {
      if (overTaskId == null || overTaskId === activeTaskId) return
      const overIndex = sourceList.indexOf(overTaskId)
      if (overIndex < 0) return
      const next = [...sourceList]
      next.splice(from, 1)
      next.splice(overIndex, 0, activeTaskId)
      groups[sourceKey] = next
      reorderTasks.mutate(flatten(groups), { onError })
      return
    }

    // 跨组：移动任务到目标分组（按落点插入目标组内顺序）。
    const targetSection = sections.find((section) => section.key === targetKey)
    if (!targetSection) return
    const targetList = [...(groups[targetKey] ?? [])]
    const insertIndex =
      overTaskId != null
        ? Math.max(0, targetList.indexOf(overTaskId))
        : targetList.length
    targetList.splice(insertIndex, 0, activeTaskId)
    groups[targetKey] = targetList

    const flattened = flatten(groups)
    const position = flattened.indexOf(activeTaskId) + 1

    moveTask.mutate(
      { id: activeTaskId, data: { group_id: targetSection.groupId, position } },
      {
        onError,
        onSettled: () => {
          // 其余任务按新全局顺序整理一遍，保证 position 连续。
          reorderTasks.mutate(flattened, { onError })
        },
      },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {sections.map((section) => (
          <Section
            key={section.key}
            section={section}
            statuses={statuses}
            statusMap={statusMap}
            style={style}
            compact={compact}
            dragEnabled={dragEnabled}
            onChangeStatus={onChangeStatus}
            onChangePriority={onChangePriority}
            onToggleDone={onToggleDone}
            onToggleSubtask={onToggleSubtask}
          />
        ))}
      </div>
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
  )
}

function flatten(groups: Groups): number[] {
  return Object.values(groups).flat()
}

interface SectionProps {
  section: TaskSection
  statuses: Status[]
  statusMap: Map<number, Status>
  style: CardSizeStyle
  compact: boolean
  dragEnabled: boolean
  onChangeStatus: (taskId: number, statusId: number | null) => void
  onChangePriority: (taskId: number, priority: number) => void
  onToggleDone: (task: Task) => void
  onToggleSubtask: (taskId: number, subtaskId: number, isDone: boolean) => void
}

function Section({
  section,
  statuses,
  statusMap,
  style,
  compact,
  dragEnabled,
  onChangeStatus,
  onChangePriority,
  onToggleDone,
  onToggleSubtask,
}: SectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `section:${section.key}` })

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-sm"
          style={{
            backgroundColor: section.color ?? 'rgb(var(--c-line-strong))',
          }}
        />
        <h3 className="text-sm font-semibold text-ink">{section.name}</h3>
        <span className="text-xs text-muted">{section.tasks.length}</span>
      </div>
      <SortableContext
        id={section.key}
        items={section.tasks.map((task) => task.id)}
        strategy={rectSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={
            'grid min-h-[80px] rounded-md transition-colors ' +
            style.gap +
            (isOver ? ' bg-accent-soft/40 ring-1 ring-accent/40' : '')
          }
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${style.min}, 1fr))`,
          }}
        >
          {section.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              status={task.status_id != null ? statusMap.get(task.status_id) : undefined}
              statuses={statuses}
              style={style}
              compact={compact}
              disabled={!dragEnabled}
              onStatusChange={onChangeStatus}
              onPriorityChange={onChangePriority}
              onToggleDone={onToggleDone}
              onToggleSubtask={onToggleSubtask}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}
