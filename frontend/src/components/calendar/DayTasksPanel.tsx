import { Clock, Plus } from 'lucide-react'
import type { Task } from '../../lib/types'
import { cn, dueState } from '../../lib/utils'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { usePreferences } from '../../store/preferences'
import { taskColor } from '../../lib/taskColor'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface DayTasksPanelProps {
  open: boolean
  dateLabel: string
  tasks: Task[]
  onClose: () => void
  onOpenTask: (id: number) => void
  onCreate: () => void
}

const STATE_DOT: Record<string, string> = {
  overdue: 'bg-danger',
  today: 'bg-warning',
  soon: 'bg-warning/70',
  normal: 'bg-success/70',
  none: 'bg-muted',
}

export function DayTasksPanel({
  open,
  dateLabel,
  tasks,
  onClose,
  onOpenTask,
  onCreate,
}: DayTasksPanelProps) {
  const { label: priorityLabel, color: priorityColor, priorities } = usePrioritiesMeta()
  const { resolvedTheme } = usePreferences()
  const isDark = resolvedTheme === 'dark'

  return (
    <Modal open={open} title={`${dateLabel} 的任务`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{tasks.length} 个任务</span>
          <Button size="sm" variant="primary" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" />
            新建
          </Button>
        </div>

        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted">这一天没有到期任务</p>
        ) : (
          <ul className="scrollbar-thin max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
            {tasks.map((task) => {
              const isDone = task.completed_at != null
              const state = dueState(task.due_date, isDone)
              const tint = taskColor(task, priorities, isDark)
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(task.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-line border-l-[3px] bg-surface px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-elevated"
                    style={{ borderLeftColor: tint }}
                  >
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full', STATE_DOT[state])}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm text-ink',
                        isDone && 'text-muted line-through',
                      )}
                    >
                      {task.title}
                    </span>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[11px]"
                      style={{
                        color: priorityColor(task.priority),
                        backgroundColor: `${priorityColor(task.priority)}26`,
                      }}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                    {task.due_date ? (
                      <span className="shrink-0 text-[11px] text-muted">
                        <Clock className="mr-0.5 inline h-3 w-3" />
                        {task.due_date.slice(11, 16)}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
