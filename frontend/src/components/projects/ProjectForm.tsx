import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/api'
import type { Project } from '../../lib/types'
import { useCreateProject, useUpdateProject } from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { ColorPicker } from '../ui/ColorPicker'
import { Field, Input, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'

interface ProjectFormProps {
  open: boolean
  onClose: () => void
  project?: Project | null
}

export function ProjectForm({ open, onClose, project }: ProjectFormProps) {
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const { push } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    setColor(project?.color ?? '#6366f1')
  }, [open, project])

  const pending = createProject.isPending || updateProject.isPending

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入项目名称')
      return
    }
    const payload = { name: trimmed, description: description.trim() || null, color }
    const handlers = {
      onSuccess: () => {
        push(project ? '项目已更新' : '项目已创建', 'success')
        onClose()
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    }
    if (project) {
      updateProject.mutate({ id: project.id, data: payload }, handlers)
    } else {
      createProject.mutate(payload, handlers)
    }
  }

  return (
    <Modal
      open={open}
      title={project ? '编辑项目' : '新建项目'}
      onClose={onClose}
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
        <Field label="项目名称">
          <Input
            autoFocus
            value={name}
            placeholder="例如：官网改版"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="描述">
          <Textarea
            rows={3}
            value={description}
            placeholder="项目简介（可选）"
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field label="颜色">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    </Modal>
  )
}
