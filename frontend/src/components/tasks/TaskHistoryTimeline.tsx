import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { TaskHistory } from '../../lib/types'
import { formatDateTime, formatDue } from '../../lib/utils'
import { sanitizeDescription } from '../../lib/sanitizeHtml'
import { useDeleteTaskHistory, useTaskHistory } from '../../hooks/queries'
import { usePrioritiesMeta } from '../../hooks/usePrioritiesMeta'
import { useToast } from '../../store/toast'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { LoadingBlock } from '../ui/Spinner'

function SnapshotContent({ entry }: { entry: TaskHistory }) {
  const { snapshot } = entry
  const { label: priorityLabel } = usePrioritiesMeta()
  const descriptionHtml = useMemo(
    () => sanitizeDescription(snapshot.description, { allowImages: false }),
    [snapshot.description],
  )

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-ink">{snapshot.title}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
        <span>状态：{snapshot.status_name ?? '未分配'}</span>
        <span>优先级：{priorityLabel(snapshot.priority)}</span>
        <span>分组：{snapshot.group_name ?? '未分组'}</span>
        <span>截止：{snapshot.due_date ? formatDue(snapshot.due_date) : '未设置'}</span>
      </div>
      {snapshot.tag_names.length > 0 ? (
        <div className="flex flex-wrap gap-1 text-xs text-muted">
          {snapshot.tag_names.map((name) => (
            <span key={name} className="rounded bg-elevated px-1.5 py-0.5">
              {name}
            </span>
          ))}
        </div>
      ) : null}
      {descriptionHtml ? (
        <div
          className="rich-content break-words text-xs leading-relaxed text-ink-soft"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : null}
    </div>
  )
}

export function TaskHistoryTimeline({ taskId }: { taskId: number }) {
  const { data: entries = [], isLoading } = useTaskHistory(taskId)
  const deleteHistory = useDeleteTaskHistory()
  const { push } = useToast()
  const [deleting, setDeleting] = useState<TaskHistory | null>(null)

  if (isLoading) return <LoadingBlock />

  if (entries.length === 0) {
    return <p className="text-xs text-muted">还没有历史记录。</p>
  }

  return (
    <>
      <ol className="relative space-y-4 border-l border-line pl-4">
        {entries.map((entry, index) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[1.4rem] top-1 h-2 w-2 rounded-full bg-accent" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink">
                  {index === 0 ? '当前版本' : `版本 ${entries.length - index}`}
                </span>
                <span className="text-[11px] text-muted">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
              <button
                type="button"
                title="删除该历史记录"
                onClick={() => setDeleting(entry)}
                className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 rounded border border-line bg-canvas/40 px-2.5 py-2">
              <SnapshotContent entry={entry} />
            </div>
          </li>
        ))}
      </ol>

      <ConfirmDialog
        open={deleting != null}
        title="删除历史记录"
        message="确定要删除这条历史记录吗？此操作不可撤销。"
        confirmLabel="删除"
        loading={deleteHistory.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteHistory.mutate(
            { taskId, historyId: deleting.id },
            {
              onSuccess: () => {
                push('历史记录已删除', 'success')
                setDeleting(null)
              },
              onError: (err) => {
                setDeleting(null)
                push(errorMessage(err), 'error')
              },
            },
          )
        }}
      />
    </>
  )
}
