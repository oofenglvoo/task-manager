import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/api'
import type { Task } from '../../lib/types'
import {
  useCreateTask,
  useProjects,
  useStatuses,
  useTags,
  useUpdateTask,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { TagPicker } from '../ui/TagPicker'

interface TaskFormProps {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultStatusId?: number | null
  defaultProjectId?: number | null
}

interface FormState {
  title: string
  projectId: number | ''
  statusId: number | ''
  priority: number
  dueDate: string
  description: string
  tagIds: number[]
}

const EMPTY: FormState = {
  title: '',
  projectId: '',
  statusId: '',
  priority: 2,
  dueDate: '',
  description: '',
  tagIds: [],
}

export function TaskForm({
  open,
  onClose,
  task,
  defaultStatusId,
  defaultProjectId,
}: TaskFormProps) {
  const { data: projects = [] } = useProjects()
  const { data: statuses = [] } = useStatuses()
  const { data: tags = [] } = useTags()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const { push } = useToast()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (task) {
      setForm({
        title: task.title,
        projectId: task.project_id,
        statusId: task.status_id ?? '',
        priority: task.priority,
        dueDate: task.due_date ?? '',
        description: task.description ?? '',
        tagIds: task.tags.map((tag) => tag.id),
      })
      return
    }
    setForm({
      ...EMPTY,
      projectId: defaultProjectId ?? '',
      statusId: defaultStatusId ?? '',
    })
  }, [open, task, defaultProjectId, defaultStatusId])

  useEffect(() => {
    if (!open || task) return
    setForm((prev) => {
      const projectId = prev.projectId === '' && projects.length ? projects[0].id : prev.projectId
      const statusId =
        prev.statusId === '' && defaultStatusId == null && statuses.length
          ? statuses[0].id
          : prev.statusId
      if (projectId === prev.projectId && statusId === prev.statusId) return prev
      return { ...prev, projectId, statusId }
    })
  }, [open, task, projects, statuses, defaultStatusId])

  const pending = createTask.isPending || updateTask.isPending

  function submit() {
    const title = form.title.trim()
    if (!title) {
      setError('请输入任务标题')
      return
    }
    if (form.projectId === '') {
      setError('请选择所属项目')
      return
    }
    const payload = {
      title,
      project_id: form.projectId,
      status_id: form.statusId === '' ? (task ? null : undefined) : form.statusId,
      priority: form.priority,
      due_date: form.dueDate || null,
      description: form.description.trim() || null,
      tag_ids: form.tagIds,
    }
    const handlers = {
      onSuccess: () => {
        push(task ? '任务已更新' : '任务已创建', 'success')
        onClose()
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    }
    if (task) {
      updateTask.mutate({ id: task.id, data: payload }, handlers)
    } else {
      createTask.mutate(payload, handlers)
    }
  }

  return (
    <Modal
      open={open}
      title={task ? '编辑任务' : '新建任务'}
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
          <Field label="项目">
            <Select
              value={form.projectId}
              onChange={(event) =>
                setForm({
                  ...form,
                  projectId: event.target.value === '' ? '' : Number(event.target.value),
                })
              }
            >
              <option value="">请选择</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
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
              <option value="">{task ? '未分配' : '默认'}</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
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
