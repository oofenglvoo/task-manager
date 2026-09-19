import { useMemo } from 'react'
import { CheckSquare, CircleAlert } from 'lucide-react'
import type { Priority, Status, Task } from '../../../lib/types'
import type { ChartPalette } from '../../../lib/chartTheme'
import { buildSwimlaneData, groupSections } from '../../../lib/mindmap'
import { cn, dueState } from '../../../lib/utils'

interface SwimlaneViewProps {
  tasks: Task[]
  statuses: Status[]
  priorities: Priority[]
  palette: ChartPalette
  height: number
  groupBy: boolean
  onOpenTask: (taskId: number) => void
}

export function SwimlaneView({
  tasks,
  statuses,
  priorities,
  palette,
  height,
  groupBy,
  onOpenTask,
}: SwimlaneViewProps) {
  const priorityNames = useMemo(
    () => new Map(priorities.map((item) => [item.id, item.name])),
    [priorities],
  )
  const sections = useMemo(
    () => (groupBy ? groupSections(tasks, statuses, priorities) : []),
    [groupBy, tasks, statuses, priorities],
  )

  return (
    <div className="scrollbar-thin overflow-auto" style={{ maxHeight: height }}>
      {groupBy ? (
        <div className="flex flex-col gap-5 p-1">
          {sections.map((section) => (
            <div key={section.id ?? 'none'}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: section.color }}
                />
                <span className="text-xs font-semibold text-ink">{section.name}</span>
                <span className="text-xs text-muted">{section.count}</span>
              </div>
              <SwimlaneGrid
                tasks={section.tasks}
                statuses={statuses}
                priorities={priorities}
                palette={palette}
                priorityNames={priorityNames}
                onOpenTask={onOpenTask}
              />
            </div>
          ))}
        </div>
      ) : (
        <SwimlaneGrid
          tasks={tasks}
          statuses={statuses}
          priorities={priorities}
          palette={palette}
          priorityNames={priorityNames}
          onOpenTask={onOpenTask}
        />
      )}
    </div>
  )
}

function SwimlaneGrid({
  tasks,
  statuses,
  priorities,
  palette,
  priorityNames,
  onOpenTask,
}: {
  tasks: Task[]
  statuses: Status[]
  priorities: Priority[]
  palette: ChartPalette
  priorityNames: Map<number, string>
  onOpenTask: (taskId: number) => void
}) {
  const data = useMemo(
    () => buildSwimlaneData(tasks, statuses, priorities),
    [tasks, statuses, priorities],
  )

  const cellKey = (priority: number, statusId: number | null) =>
    `${priority}-${statusId ?? 'none'}`

  return (
    <div className="flex min-w-max gap-3 p-1">
      <div className="flex shrink-0 flex-col gap-3">
        <div className="h-7" />
        {data.priorities.map((priority) => (
          <div
            key={priority}
            title={priorityNames.get(priority) ?? `优先级 ${priority}`}
            className="app-surface-elevated flex min-h-[104px] w-16 items-center gap-2 rounded-md border border-line px-2"
          >
            <span
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: palette.priority[priority] }}
            />
            <span
              className="text-xs font-semibold leading-tight"
              style={{ color: palette.priority[priority] }}
            >
              {priorityNames.get(priority) ?? `${priority}`}
            </span>
          </div>
        ))}
      </div>

      {data.statuses.map((column) => (
        <div key={column.id ?? 'none'} className="flex w-56 shrink-0 flex-col gap-3">
          <div
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold"
            style={{ color: column.color, backgroundColor: `${column.color}1f` }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            {column.name}
          </div>
          {data.priorities.map((priority) => {
            const cell = data.cells.find(
              (item) => item.priority === priority && item.statusId === column.id,
            )
            return (
              <div
                key={cellKey(priority, column.id)}
                className={cn(
                  'min-h-[104px] rounded-md border p-1.5',
                  cell
                    ? 'border-line/70 bg-surface'
                    : 'border-dashed border-line/40 bg-transparent',
                )}
              >
                {cell ? (
                  <div className="flex flex-col gap-1">
                    {cell.tasks.map((task) => (
                      <SwimlaneTask
                        key={task.id}
                        task={task}
                        color={palette.priority[task.priority]}
                        doneColor={palette.done}
                        onClick={() => onOpenTask(task.id)}
                      />
                    ))}
                    {cell.total > cell.tasks.length ? (
                      <span className="px-1.5 pt-0.5 text-[10px] text-muted">
                        还有 {cell.total - cell.tasks.length} 个…
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SwimlaneTask({
  task,
  color,
  doneColor,
  onClick,
}: {
  task: Task
  color: string
  doneColor: string
  onClick: () => void
}) {
  const isDone = task.completed_at != null
  const overdue = dueState(task.due_date, isDone) === 'overdue'
  const doneCount = task.subtasks.filter((item) => item.is_done).length

  return (
    <button
      type="button"
      onClick={onClick}
      title={task.title}
      className={cn(
        'app-surface-elevated flex w-full items-center gap-1.5 rounded border border-line/60 px-1.5 py-1 text-left text-[11px] leading-tight text-ink transition-colors hover:border-line-strong hover:bg-elevated',
        isDone && 'text-muted',
      )}
    >
      <span
        className="h-3.5 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: isDone ? doneColor : color }}
      />
      <span className={cn('flex-1 truncate', isDone && 'line-through')}>{task.title}</span>
      {overdue ? (
        <CircleAlert className="h-3 w-3 shrink-0 text-danger" />
      ) : task.subtasks.length > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-muted">
          <CheckSquare className="h-2.5 w-2.5" />
          {doneCount}/{task.subtasks.length}
        </span>
      ) : null}
    </button>
  )
}
