import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { CardSizeStyle } from '../../store/preferences'
import type { Status, Task } from '../../lib/types'
import { errorMessage } from '../../lib/api'
import { useMoveTask, useReorderGroups, useReorderTasks } from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { TaskCard } from '../tasks/TaskCard'
import { SortableTaskCard } from './SortableTaskCard'

export interface TaskSection {
  key: string
  groupId: number | null
  name: string
  color: string | null
  note: string | null
  /** 分组排序位置（未分组为 null）。 */
  position: number | null
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

/**
 * 任务拖拽的碰撞策略（按优先级）：
 * 1. 分组顶部的「插到最前」细条（section-start:）命中时优先，否则 8px 细条抢不过卡片；
 * 2. 否则在命中的任务卡里取「距指针最近」的一张（pointerWithin 常有多张卡同时命中）；
 * 3. 没命中卡片时取分组容器（section:），指针不在任何投放区时回退矩形相交。
 *
 * 注意：用「指针坐标」而不是 dragged rect 中心来选最近卡片，
 * 否则命中会跟着拖拽浮层偏移，落到错误的位置。
 */
const isTopStripId = (id: UniqueIdentifier) => String(id).startsWith('section-start:')
const isContainerId = (id: UniqueIdentifier) =>
  String(id).startsWith('section:') || String(id).startsWith('section-start:')

function center(rect: { left: number; top: number; width: number; height: number }) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function distanceTo(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

const taskCollisionDetection: CollisionDetection = (args) => {
  const { pointerCoordinates, droppableRects } = args
  const candidates = pointerWithin(args)
  const collisions = candidates.length > 0 ? candidates : rectIntersection(args)

  const topStrips = collisions.filter((c) => isTopStripId(c.id))
  if (topStrips.length > 0) return topStrips

  const cards = collisions.filter((c) => !isContainerId(c.id))
  if (cards.length > 0) {
    if (!pointerCoordinates) return [cards[0]]
    const scored = cards
      .map((collision) => {
        const rect = droppableRects.get(collision.id)
        return {
          collision,
          distance: rect ? distanceTo(center(rect), pointerCoordinates) : Number.POSITIVE_INFINITY,
        }
      })
      .sort((a, b) => a.distance - b.distance)
    return [scored[0].collision]
  }

  const containers = collisions.filter((c) => isContainerId(c.id))
  return containers.length > 0 ? containers : collisions
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
  const reorderGroups = useReorderGroups()
  const { push } = useToast()
  const [activeId, setActiveId] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  // 分组本身可拖拽排序（仅在有分组时；「未分组」固定末尾不可拖）。
  const sortableSections = sections.filter((section) => section.groupId != null)
  const taskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const groupIdOf = (id: UniqueIdentifier) => Number(String(id).replace('group:', ''))
    const orderedIds = sortableSections.map((section) => section.groupId as number)
    const from = orderedIds.indexOf(groupIdOf(active.id))
    const to = orderedIds.indexOf(groupIdOf(over.id))
    if (from < 0 || to < 0) return
    const next = [...orderedIds]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    reorderGroups.mutate(next, { onError })
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

    // 落点可能是任务卡、分组容器本体，或分组顶部的「插到最前」投放区。
    const overId = String(over.id)
    let targetKey: string | null = null
    let overTaskId: number | null = null
    let atStart = false
    if (overId.startsWith('section-start:')) {
      targetKey = overId.slice('section-start:'.length)
      atStart = true
    } else if (overId.startsWith('section:')) {
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
      // 放到容器本体（末尾）或容器顶部投放区（开头）时也允许同组移动。
      let overIndex: number
      if (atStart) {
        overIndex = 0
      } else if (overTaskId == null) {
        overIndex = sourceList.length
      } else {
        if (overTaskId === activeTaskId) return
        overIndex = sourceList.indexOf(overTaskId)
        if (overIndex < 0) return
      }
      const next = [...sourceList]
      next.splice(from, 1)
      // 移除原项后，落点在其之后的索引需要前移一位。
      const insertIndex = from < overIndex ? overIndex - 1 : overIndex
      if (insertIndex === from) return
      next.splice(insertIndex, 0, activeTaskId)
      groups[sourceKey] = next
      reorderTasks.mutate(flatten(groups), { onError })
      return
    }

    // 跨组：移动任务到目标分组（按落点插入目标组内顺序）。
    const targetSection = sections.find((section) => section.key === targetKey)
    if (!targetSection) return
    // 先从原分组移除，否则 flatten 时该任务会在源/目标两组各出现一次，导致顺序错乱。
    const sourceWithout = sourceList.filter((id) => id !== activeTaskId)
    groups[sourceKey] = sourceWithout
    const targetList = [...(groups[targetKey] ?? [])]
    const insertIndex = atStart
      ? 0
      : overTaskId != null
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
    <>
      {sortableSections.length > 1 ? (
        <DndContext
          sensors={taskSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleGroupDragEnd}
        >
          <SortableContext
            items={sortableSections.map((section) => `group:${section.groupId}`)}
            strategy={verticalListSortingStrategy}
          >
            <TaskDndContext
              sensors={sensors}
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
                    groupDraggable={section.groupId != null}
                    onChangeStatus={onChangeStatus}
                    onChangePriority={onChangePriority}
                    onToggleDone={onToggleDone}
                    onToggleSubtask={onToggleSubtask}
                  />
                ))}
              </div>
              {activeTask ? (
                <DragOverlay>
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
                </DragOverlay>
              ) : null}
            </TaskDndContext>
          </SortableContext>
        </DndContext>
      ) : (
        <TaskDndContext
          sensors={sensors}
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
                groupDraggable={false}
                onChangeStatus={onChangeStatus}
                onChangePriority={onChangePriority}
                onToggleDone={onToggleDone}
                onToggleSubtask={onToggleSubtask}
              />
            ))}
          </div>
          {activeTask ? (
            <DragOverlay>
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
            </DragOverlay>
          ) : null}
        </TaskDndContext>
      )}
    </>
  )
}

interface TaskDndContextProps {
  sensors: ReturnType<typeof useSensors>
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  children: ReactNode
}

function TaskDndContext({
  sensors,
  onDragStart,
  onDragEnd,
  children,
}: TaskDndContextProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={taskCollisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {children}
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
  groupDraggable: boolean
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
  groupDraggable,
  onChangeStatus,
  onChangePriority,
  onToggleDone,
  onToggleSubtask,
}: SectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `section:${section.key}` })
  const { setNodeRef: setStartRef, isOver: isOverStart } = useDroppable({
    id: `section-start:${section.key}`,
  })
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group:${section.groupId ?? `none-${section.key}`}`,
    disabled: !groupDraggable,
    data: { type: 'group', groupId: section.groupId },
  })

  const style_ = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <section ref={setSortableRef} style={style_} className="bg-transparent">
      <div className="mb-2 flex items-center gap-2">
        {groupDraggable ? (
          <button
            type="button"
            title="拖动排序"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded border border-transparent p-0.5 text-muted transition-colors hover:border-line hover:bg-elevated hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="w-[18px]" />
        )}
        <span
          className="h-3.5 w-3.5 rounded-sm"
          style={{
            backgroundColor: section.color ?? 'rgb(var(--c-line-strong))',
          }}
        />
        <h3 className="text-sm font-semibold text-ink">{section.name}</h3>
        <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
          {section.tasks.length}
        </span>
      </div>
      {section.note ? (
        <p className="mb-3 pl-[26px] text-xs leading-relaxed text-muted whitespace-pre-wrap">
          {section.note}
        </p>
      ) : (
        <div className="mb-2" />
      )}
      <SortableContext
        id={section.key}
        items={section.tasks.map((task) => task.id)}
        strategy={rectSortingStrategy}
      >
        <div
          ref={setStartRef}
          aria-hidden
          className={
            'mb-1.5 h-2 rounded-full transition-colors ' +
            (isOverStart ? 'bg-accent/60' : 'bg-transparent')
          }
        />
        <div
          ref={setNodeRef}
          className={
            'grid min-h-[80px] rounded-lg transition-colors ' +
            style.gap +
            (isOver ? ' bg-accent-soft ring-1 ring-accent/40' : '')
          }
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${style.min}, 1fr))`,
          }}
        >
          {section.tasks.map((task) => (
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
