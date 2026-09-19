import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/api'
import { useCreateTask, useGroups, useStatuses, useTags } from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { TagPicker } from '../ui/TagPicker'

interface TaskFormProps {
  open: boolean
  onClose: () => void
  defaultStatusId?: number | null
}

interface FormState {
  title: string
  statusId: number | ''
  groupId: number | ''
  priority: number
  dueDate: string
  description: string
  tagIds: number[]
}

const EMPTY: FormState = {
  title: '',
  statusId: '',
  groupId: '',
  priority: 2,
  dueDate: '',
  description: '',
  tagIds: [],
}

export function TaskForm({ open, onClose, defaultStatusId }: TaskFormProps) {
  const { data: statuses = [] } = useStatuses()
  const { data: groups = [] } = useGroups()
  const { data: tags = [] } = useTags()
  const createTask = useCreateTask()
  const { push } = useToast()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm({
      ...EMPTY,
      statusId: defaultStatusId ?? '',
    })
  }, [open, defaultStatusId])

  useEffect(() => {
    if (!open) return
    setForm((prev) => {
      const statusId =
        prev.statusId === '' && defaultStatusId == null && statuses.length
          ? statuses[0].id
          : prev.statusId
      if (statusId === prev.statusId) return prev
      return { ...prev, statusId }
    })
  }, [open, statuses, defaultStatusId])

  const pending = createTask.isPending

  function submit() {
    const title = form.title.trim()
    if (!title) {
      setError('请输入任务标题')
      return
    }
    const payload = {
      title,
      status_id: form.statusId === '' ? undefined : form.statusId,
      group_id: form.groupId === '' ? null : form.groupId,
      priority: form.priority,
      due_date: form.dueDate || null,
      description: form.description.trim() || null,
      tag_ids: form.tagIds,
    }
    createTask.mutate(payload, {
      onSuccess: () => {
        push('任务已创建', 'success')
        onClose()
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    })
  }

  return (
    <Modal
      open={open}
      title="新建任务"
      onClose={onClose}
      width="max-w-xl"
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="标题">
          <Input
            autoFocus
            value={form.title}
            placeholder="要做什么？"
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="状态">
            <Select
              value={form.statusId}
              onChange={(event) =>
                setForm({
                  ...form,
                  statusId: event.target.value === '' ? '' : Number(event.target.value),
                })
              }
            >
              <option value="">默认</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="分组">
            <Select
              value={form.groupId}
              onChange={(event) =>
                setForm({
                  ...form,
                  groupId: event.target.value === '' ? '' : Number(event.target.value),
                })
              }
            >
              <option value="">未分组</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="优先级">
            <Select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}
            >
              <option value={1}>低</option>
              <option value={2}>中</option>
              <option value={3}>高</option>
            </Select>
          </Field>
          <Field label="截止日期">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>
        </div>

        <Field label="标签">
          <TagPicker
            tags={tags}
            selected={form.tagIds}
            onChange={(tagIds) => setForm({ ...form, tagIds })}
          />
        </Field>

        <Field label="描述">
          <Textarea
            rows={4}
            value={form.description}
            placeholder="补充说明（可选）"
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    </Modal>
  )
}
