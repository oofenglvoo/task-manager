import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Status } from '../../lib/types'
import {
  useCreateStatus,
  useDeleteStatus,
  useReorderStatuses,
  useStatuses,
  useUpdateStatus,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { ColorPicker } from '../ui/ColorPicker'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Field, Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { LoadingBlock } from '../ui/Spinner'

interface FormState {
  name: string
  color: string
  isDone: boolean
}

const EMPTY: FormState = { name: '', color: '#94a3b8', isDone: false }

export function StatusManager() {
  const { data: statuses = [], isLoading } = useStatuses()
  const createStatus = useCreateStatus()
  const updateStatus = useUpdateStatus()
  const deleteStatus = useDeleteStatus()
  const reorderStatuses = useReorderStatuses()
  const { push } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Status | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Status | null>(null)

  useEffect(() => {
    if (!formOpen) return
    setError('')
    setForm(
      editing
        ? { name: editing.name, color: editing.color, isDone: editing.is_done }
        : EMPTY,
    )
  }, [formOpen, editing])

  const pending = createStatus.isPending || updateStatus.isPending
  const onError = (err: unknown) => push(errorMessage(err), 'error')

  function submit() {
    const name = form.name.trim()
    if (!name) {
      setError('请输入状态名称')
      return
    }
    const payload = { name, color: form.color, is_done: form.isDone }
    const handlers = {
      onSuccess: () => {
        push(editing ? '状态已更新' : '状态已创建', 'success')
        setFormOpen(false)
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    }
    if (editing) {
      updateStatus.mutate({ id: editing.id, data: payload }, handlers)
    } else {
      createStatus.mutate(payload, handlers)
    }
  }

  function move(index: number, delta: number) {
    const next = [...statuses]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorderStatuses.mutate(
      next.map((status) => status.id),
      { onError },
    )
  }

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">状态</h2>
          <p className="text-xs text-muted">看板列与任务流转状态</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          新建
        </Button>
      </header>

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <ul className="divide-y divide-line/60">
          {statuses.map((status, index) => (
            <li key={status.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span className="flex-1 text-sm text-ink">{status.name}</span>
              {status.is_done ? (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                  已完成
                </span>
              ) : null}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === statuses.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(status)
                    setFormOpen(true)
                  }}
                  className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(status)}
                  className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        title={editing ? '编辑状态' : '新建状态'}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)} disabled={pending}>
              取消
            </Button>
            <Button variant="primary" onClick={submit} disabled={pending}>
              {pending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="名称">
            <Input
              autoFocus
              value={form.name}
              placeholder="例如：进行中"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="颜色">
            <ColorPicker
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <Checkbox
              checked={form.isDone}
              onChange={(isDone) => setForm({ ...form, isDone })}
            />
            标记为「已完成」状态（任务进入后自动记录完成时间）
          </label>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title="删除状态"
        message={
          deleting
            ? `确定要删除状态「${deleting.name}」吗？仅当没有任务使用它时才能删除。`
            : undefined
        }
        confirmLabel="删除"
        loading={deleteStatus.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteStatus.mutate(deleting.id, {
            onSuccess: () => {
              push('状态已删除', 'success')
              setDeleting(null)
            },
            onError: (err) => {
              setDeleting(null)
              onError(err)
            },
          })
        }}
      />
    </section>
  )
}
