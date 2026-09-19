import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Group } from '../../lib/types'
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useUpdateGroup,
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
}

const EMPTY: FormState = { name: '', color: '#6366f1' }

export function GroupManager() {
  const { data: groups = [], isLoading } = useGroups()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const { push } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Group | null>(null)

  useEffect(() => {
    if (!formOpen) return
    setError('')
    setForm(editing ? { name: editing.name, color: editing.color } : EMPTY)
  }, [formOpen, editing])

  const pending = createGroup.isPending || updateGroup.isPending
  const onError = (err: unknown) => push(errorMessage(err), 'error')

  function submit() {
    const name = form.name.trim()
    if (!name) {
      setError('请输入分组名称')
      return
    }
    const payload = { name, color: form.color }
    const handlers = {
      onSuccess: () => {
        push(editing ? '分组已更新' : '分组已创建', 'success')
        setFormOpen(false)
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    }
    if (editing) {
      updateGroup.mutate({ id: editing.id, data: payload }, handlers)
    } else {
      createGroup.mutate(payload, handlers)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          把任务归属到分组，可在看板/列表/脑图中按分组查看
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          新建分组
        </Button>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-xs text-muted">
          还没有分组
        </p>
      ) : (
        <ul className="divide-y divide-line/60 rounded-lg border border-line">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex-1 text-sm text-ink">{group.name}</span>
              <span className="text-xs text-muted">{group.task_count} 个任务</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  title="编辑"
                  onClick={() => {
                    setEditing(group)
                    setFormOpen(true)
                  }}
                  className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="删除"
                  onClick={() => setDeleting(group)}
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
        title={editing ? '编辑分组' : '新建分组'}
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
              placeholder="例如：工作"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="颜色">
            <ColorPicker
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
            />
          </Field>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title="删除分组"
        message={
          deleting
            ? deleting.task_count > 0
              ? `分组「${deleting.name}」下还有 ${deleting.task_count} 个任务，删除后这些任务会变为「未分组」。确定继续吗？`
              : `确定要删除分组「${deleting.name}」吗？`
            : undefined
        }
        confirmLabel="删除"
        loading={deleteGroup.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteGroup.mutate(deleting.id, {
            onSuccess: () => {
              push('分组已删除', 'success')
              setDeleting(null)
            },
            onError: (err) => {
              setDeleting(null)
              onError(err)
            },
          })
        }}
      />
    </div>
  )
}
