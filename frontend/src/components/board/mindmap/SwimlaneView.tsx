import { useMemo } from 'react'
import type { Status, Task } from '../../../lib/types'
import { buildSwimlaneData, priorityColor, priorityLabel } from '../../../lib/mindmap'
import { cn } from '../../../lib/utils'

interface SwimlaneViewProps {
  tasks: Task[]
  statuses: Status[]
  height: number
  onOpenTask: (taskId: number) => void
}

export function SwimlaneView({ tasks, statuses, height, onOpenTask }: SwimlaneViewProps) {
  const data = useMemo(() => buildSwimlaneData(tasks, statuses), [tasks, statuses])

  const cellKey = (priority: number, statusId: number | null) => `${priority}-${statusId ?? 'none'}`

  return (
    <div className="scrollbar-thin overflow-auto" style={{ maxHeight: height }}>
      <div className="flex min-w-max gap-3 p-1">
        <div className="flex shrink-0 flex-col gap-3">
          <div className="h-6" />
          {data.priorities.map((priority) => (
            <div
              key={priority}
              className="flex h-28 w-14 items-center justify-center rounded-md border text-xs font-semibold"
              style={{
                color: priorityColor(priority),
                borderColor: priorityColor(priority),
                backgroundColor: 'rgb(var(--c-elevated))',
              }}
            >
              {priorityLabel(priority).replace('优先级', '')}
            </div>
          ))}
        </div>

        {data.statuses.map((column) => (
          <div key={column.id ?? 'none'} className="flex w-56 shrink-0 flex-col gap-3">
            <div
              className="flex h-6 items-center rounded-md px-2 text-xs font-semibold"
              style={{ color: column.color, backgroundColor: `${column.color}22` }}
            >
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
                    'h-28 overflow-hidden rounded-md border border-line/70 bg-surface p-1.5',
                    !cell && 'opacity-40',
                  )}
                >
                  {cell ? (
                    <div className="flex h-full flex-col gap-1 overflow-y-auto">
                      {cell.tasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onOpenTask(task.id)}
                          title={task.title}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded border border-line/60 px-1.5 py-1 text-left text-[11px] leading-tight text-ink transition-colors hover:border-line-strong hover:bg-elevated',
                            task.completed_at != null && 'text-muted line-through',
                          )}
                        >
                          <span
                            className="h-3 w-1 shrink-0 rounded-full"
                            style={{ backgroundColor: priorityColor(task.priority) }}
                          />
                          <span className="truncate">{task.title}</span>
                        </button>
                      ))}
                      {cell.total > cell.tasks.length ? (
                        <span className="px-1.5 text-[10px] text-muted">
                          还有 {cell.total - cell.tasks.length} 个…
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted">
                      无
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
