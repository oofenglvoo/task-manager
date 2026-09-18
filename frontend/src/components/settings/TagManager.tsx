import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Tag } from '../../lib/types'
import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
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

const EMPTY: FormState = { name: '', color: '#38bdf8' }

export function TagManager() {
  const { data: tags = [], isLoading } = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()
  const { push } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Tag | null>(null)

  useEffect(() => {
    if (!formOpen) return
    setError('')
    setForm(editing ? { name: editing.name, color: editing.color } : EMPTY)
  }, [formOpen, editing])

  const pending = createTag.isPending || updateTag.isPending
  const onError = (err: unknown) => push(errorMessage(err), 'error')

  function submit() {
    const name = form.name.trim()
    if (!name) {
      setError('请输入标签名称')
      return
    }
    const payload = { name, color: form.color }
    const handlers = {
      onSuccess: () => {
        push(editing ? '标签已更新' : '标签已创建', 'success')
        setFormOpen(false)
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    }
    if (editing) {
      updateTag.mutate({ id: editing.id, data: payload }, handlers)
    } else {
      createTag.mutate(payload, handlers)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">标签</h2>
          <p className="text-xs text-muted">为任务添加分类标签</p>
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
      ) : tags.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted">还没有标签</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 text-sm text-ink">{tag.name}</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(tag)
                    setFormOpen(true)
                  }}
                  className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(tag)}
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
        title={editing ? '编辑标签' : '新建标签'}
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
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title="删除标签"
        message={deleting ? `确定要删除标签「${deleting.name}」吗？` : undefined}
        confirmLabel="删除"
        loading={deleteTag.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteTag.mutate(deleting.id, {
            onSuccess: () => {
              push('标签已删除', 'success')
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
