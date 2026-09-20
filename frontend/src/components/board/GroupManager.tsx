import { useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Group } from '../../lib/types'
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useReorderGroups,
  useUpdateGroup,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { ColorPicker } from '../ui/ColorPicker'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Field, Input, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { LoadingBlock } from '../ui/Spinner'

interface FormState {
  name: string
  color: string
  note: string
}

const EMPTY: FormState = { name: '', color: '#6366f1', note: '' }

export function GroupManager() {
  const { data: groups = [], isLoading } = useGroups()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const reorderGroups = useReorderGroups()
  const { push } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Group | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!formOpen) return
    setError('')
    setForm(
      editing
        ? { name: editing.name, color: editing.color, note: editing.note ?? '' }
        : EMPTY,
    )
  }, [formOpen, editing])

  const pending = createGroup.isPending || updateGroup.isPending
  const onError = (err: unknown) => push(errorMessage(err), 'error')

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = groups.map((group) => group.id)
    const from = ids.indexOf(Number(active.id))
    const to = ids.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    const next = arrayMove(ids, from, to)
    reorderGroups.mutate(next, { onError })
  }

  function submit() {
    const name = form.name.trim()
    if (!name) {
      setError('请输入分组名称')
      return
    }
    const note = form.note.trim()
    const payload = { name, color: form.color, note: note || null }
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 min-w-0 text-xs leading-relaxed text-muted">
          把任务归属到分组，可在看板/列表/脑图中按分组查看；拖动可调整顺序
        </p>
        <Button
          size="sm"
          variant="primary"
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
        <p className="rounded-lg border border-dashed border-line-strong/60 px-4 py-10 text-center text-xs text-muted">
          还没有分组
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={groups.map((group) => group.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-line/60 overflow-hidden rounded-lg border border-line bg-surface">
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  onEdit={() => {
                    setEditing(group)
                    setFormOpen(true)
                  }}
                  onDelete={() => setDeleting(group)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
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
          <Field label="备注">
            <Textarea
              rows={3}
              value={form.note}
              placeholder="可选，填写后显示在任务栏该分组标题下方"
              onChange={(event) => setForm({ ...form, note: event.target.value })}
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

interface GroupRowProps {
  group: Group
  onEdit: () => void
  onDelete: () => void
}

function GroupRow({ group, onEdit, onDelete }: GroupRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }}
      className="flex items-start gap-3 bg-surface px-4 py-2.5"
    >
      <button
        type="button"
        title="拖动排序"
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab touch-none rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: group.color }}
          />
          <span className="text-sm text-ink">{group.name}</span>
        </div>
        {group.note ? (
          <p className="pl-5 text-xs text-muted whitespace-pre-wrap">{group.note}</p>
        ) : null}
      </div>
      <span className="mt-0.5 text-xs text-muted">{group.task_count} 个任务</span>
      <div className="mt-0.5 flex items-center gap-0.5">
        <button
          type="button"
          title="编辑"
          onClick={onEdit}
          className="rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="删除"
          onClick={onDelete}
          className="rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
