import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Priority } from '../../lib/types'
import {
  useCreatePriority,
  useDeletePriority,
  usePriorities,
  useReorderPriorities,
  useUpdatePriority,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { ColorPicker } from '../ui/ColorPicker'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Field, Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { LoadingBlock } from '../ui/Spinner'

interface FormState {
  name: string
  color: string
  level: string
}

const EMPTY: FormState = { name: '', color: '#6b7280', level: '' }

export function PriorityManager() {
  const { data: priorities = [], isLoading } = usePriorities()
  const createPriority = useCreatePriority()
  const updatePriority = useUpdatePriority()
  const deletePriority = useDeletePriority()
  const reorderPriorities = useReorderPriorities()
  const { push } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Priority | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Priority | null>(null)

  useEffect(() => {
    if (!formOpen) return
    setError('')
    setForm(
      editing
        ? { name: editing.name, color: editing.color, level: String(editing.level) }
        : EMPTY,
    )
  }, [formOpen, editing])

  const pending = createPriority.isPending || updatePriority.isPending
  const onError = (err: unknown) => push(errorMessage(err), 'error')

  function submit() {
    const name = form.name.trim()
    if (!name) {
      setError('请输入优先级名称')
      return
    }
    const level = form.level.trim() === '' ? undefined : Number(form.level)
    if (level !== undefined && (!Number.isInteger(level) || level < 1)) {
      setError('权重需为不小于 1 的整数')
      return
    }
    const payload = { name, color: form.color, level }
    const handlers = {
      onSuccess: () => {
        push(editing ? '优先级已更新' : '优先级已创建', 'success')
        setFormOpen(false)
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    }
    if (editing) {
      updatePriority.mutate(
        { id: editing.id, data: { name, color: form.color, ...(level !== undefined ? { level } : {}) } },
        handlers,
      )
    } else {
      createPriority.mutate(payload, handlers)
    }
  }

  function move(index: number, delta: number) {
    const next = [...priorities]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorderPriorities.mutate(
      next.map((item) => item.id),
      { onError },
    )
  }

  return (
    <section className="rounded-xl border border-line bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">优先级</h2>
          <p className="mt-1 text-xs text-muted">
            可增删改名称、颜色与权重；权重越大越优先，排序决定看板/图表展示顺序
          </p>
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
        <ul className="divide-y divide-line/60 overflow-hidden">
          {priorities.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1 text-sm text-ink">{item.name}</span>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-muted">
                权重 {item.level}
              </span>
              <span className="mt-1 text-xs text-muted">{item.task_count} 个任务</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === priorities.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(item)
                    setFormOpen(true)
                  }}
                  className="rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(item)}
                  className="rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-danger"
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
        title={editing ? '编辑优先级' : '新建优先级'}
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
              placeholder="例如：紧急"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="颜色">
            <ColorPicker
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
            />
          </Field>
          <Field label="权重（越大越优先，留空则自动取最大值 +1）">
            <Input
              type="number"
              min={1}
              value={form.level}
              placeholder="例如：4"
              onChange={(event) => setForm({ ...form, level: event.target.value })}
            />
          </Field>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title="删除优先级"
        message={
          deleting
            ? deleting.task_count > 0
              ? `优先级「${deleting.name}」下还有 ${deleting.task_count} 个任务，请先调整这些任务的优先级。确定要尝试删除吗？`
              : `确定要删除优先级「${deleting.name}」吗？`
            : undefined
        }
        confirmLabel="删除"
        loading={deletePriority.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deletePriority.mutate(deleting.id, {
            onSuccess: () => {
              push('优先级已删除', 'success')
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
