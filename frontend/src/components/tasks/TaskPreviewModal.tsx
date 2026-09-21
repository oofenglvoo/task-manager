import { useMemo } from 'react'
import { CalendarClock, CheckSquare, Clock, Pencil } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import { sanitizeDescription } from '../../lib/sanitizeHtml'
import { cn, dueBadgeClass, dueLabel, formatDateTime } from '../../lib/utils'
import type { Task } from '../../lib/types'
import { useStatuses, useTask, useUpdateSubtask } from '../../hooks/queries'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { usePreferences } from '../../store/preferences'
import { useToast } from '../../store/toast'
import { useUI } from '../../store/ui'
import { cardSurfaceStyle } from '../../lib/priority'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { TagChip } from '../ui/Badge'

/**
 * 只读的「放大版卡片」：点击看板卡片正文打开。
 * 描述完整显示（含图片）、子任务全列出且可勾选，其余字段只读；
 * 底部「编辑」切到可编辑的 TaskDetailDrawer。
 */
export function TaskPreviewModal() {
  const { previewTaskId, closePreview, openTask } = useUI()
  const { data: task, isLoading } = useTask(previewTaskId)
  const { priorities, byId } = usePrioritiesMeta()
  const { resolvedTheme } = usePreferences()

  const open = previewTaskId != null

  return (
    <Modal
      open={open}
      onClose={closePreview}
      width="max-w-3xl"
      scrollable
      footer={
        task ? (
          <>
            <div className="flex-1" />
            <Button
              onClick={() => {
                closePreview()
                openTask(task.id)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              编辑
            </Button>
            <Button variant="primary" onClick={closePreview}>
              关闭
            </Button>
          </>
        ) : null
      }
    >
      {isLoading || !task ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      ) : (
        <TaskPreviewBody
          task={task}
          priorities={priorities}
          priorityLabel={byId}
          isDark={resolvedTheme === 'dark'}
        />
      )}
    </Modal>
  )
}

function TaskPreviewBody({
  task,
  priorities,
  priorityLabel,
  isDark,
}: {
  task: Task
  priorities: ReturnType<typeof usePrioritiesMeta>['priorities']
  priorityLabel: ReturnType<typeof usePrioritiesMeta>['byId']
  isDark: boolean
}) {
  const updateSubtask = useUpdateSubtask()
  const { push } = useToast()

  const isDone = task.completed_at != null
  const surface = cardSurfaceStyle(task, priorities, isDone, isDark)
  const priority = priorityLabel(task.priority)
  const { data: statuses = [] } = useStatuses()
  const status =
    task.status_id != null ? statuses.find((item) => item.id === task.status_id) : undefined
  const doneCount = task.subtasks.filter((item) => item.is_done).length
  const progress = task.subtasks.length
    ? Math.round((doneCount / task.subtasks.length) * 100)
    : 0

  // 预览是「放大看」的地方，描述里的图片要显示出来（卡片出于性能会去掉）。
  const descriptionHtml = useMemo(
    () => sanitizeDescription(task.description, { allowImages: true }),
    [task.description],
  )

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  return (
    <div className="flex min-h-0 flex-col">
      <header
        className={cn(
          '-mx-5 -mt-4 mb-4 shrink-0 border-b border-line/60 px-5 py-4',
          surface.className,
        )}
        style={surface.style}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span className={isDone ? 'text-success' : ''}>
            {isDone ? '已完成' : '进行中'}
          </span>
          <span className="text-muted">·</span>
          <span className="text-muted">#{task.id}</span>
        </div>
        <h2
          className={cn(
            'mt-1.5 break-words text-lg font-semibold leading-snug text-ink',
            isDone && 'text-muted line-through',
          )}
        >
          {task.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {status ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                color: status.color,
                borderColor: `${status.color}99`,
                backgroundColor: `${status.color}26`,
              }}
            >
              {status.name}
            </span>
          ) : null}
          {priority ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                color: priority.color,
                borderColor: `${priority.color}99`,
                backgroundColor: `${priority.color}26`,
              }}
            >
              {priority.name}
            </span>
          ) : null}
          {task.group ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                color: task.group.color,
                borderColor: `${task.group.color}99`,
                backgroundColor: `${task.group.color}26`,
              }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-sm"
                style={{ backgroundColor: task.group.color }}
              />
              {task.group.name}
            </span>
          ) : null}
        </div>
      </header>

      <div className="space-y-6">
        {descriptionHtml ? (
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-ink-soft">任务详情</h3>
            <div
              className="rich-content break-words text-sm leading-relaxed text-ink"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </section>
        ) : null}

        {task.subtasks.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <CheckSquare className="h-3.5 w-3.5" />
                子任务
              </h3>
              <span className="text-xs text-muted">
                {doneCount}/{task.subtasks.length} · {progress}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ul className="space-y-1">
              {task.subtasks.map((subtask) => (
                <li
                  key={subtask.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-elevated"
                >
                  <Checkbox
                    checked={subtask.is_done}
                    ariaLabel={subtask.title}
                    onChange={(checked) =>
                      updateSubtask.mutate(
                        {
                          taskId: task.id,
                          id: subtask.id,
                          data: { is_done: checked },
                        },
                        { onError },
                      )
                    }
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-sm',
                      subtask.is_done && 'text-muted line-through',
                    )}
                  >
                    {subtask.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {task.tags.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-ink-soft">标签</h3>
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            <CalendarClock className="h-3.5 w-3.5" />
            时间
          </h3>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">截止时间</dt>
              <dd className="text-ink">
                {task.due_date ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                      !isDone && dueBadgeClass(task.due_date, isDone),
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {dueLabel(task.due_date, isDone)}
                  </span>
                ) : (
                  <span className="text-muted">未设置</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">创建时间</dt>
              <dd className="text-ink">{formatDateTime(task.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">更新时间</dt>
              <dd className="text-ink">{formatDateTime(task.updated_at)}</dd>
            </div>
            {task.completed_at ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">完成时间</dt>
                <dd className="text-ink">{formatDateTime(task.completed_at)}</dd>
              </div>
            ) : null}
            {task.is_archived ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">状态</dt>
                <dd className="text-warning">已归档</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>
    </div>
  )
}
