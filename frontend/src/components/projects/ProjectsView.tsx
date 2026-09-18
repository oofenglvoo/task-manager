import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { Project } from '../../lib/types'
import {
  useArchiveProject,
  useDeleteProject,
  useProjects,
} from '../../hooks/queries'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { LoadingBlock } from '../ui/Spinner'
import { ProjectForm } from './ProjectForm'

export function ProjectsView() {
  const [showArchived, setShowArchived] = useState(false)
  const { data: projects = [], isLoading } = useProjects(showArchived)
  const archiveProject = useArchiveProject()
  const deleteProject = useDeleteProject()
  const { push } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  const onError = (error: unknown) => push(errorMessage(error), 'error')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-ink">项目管理</h1>
          <p className="text-xs text-muted">创建、编辑与归档项目</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowArchived((prev) => !prev)}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? '查看中：已归档' : '已归档'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            新建项目
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : projects.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title={showArchived ? '没有已归档的项目' : '还没有项目'}
            description="创建第一个项目来组织你的任务。"
            action={
              showArchived ? undefined : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  新建项目
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="scrollbar-thin grid flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <h2 className="text-sm font-semibold text-ink">{project.name}</h2>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {project.task_count} 个任务
                </span>
              </div>
              <p className="line-clamp-2 min-h-[2.5rem] text-xs text-muted">
                {project.description || '暂无描述'}
              </p>
              <div className="flex items-center gap-1 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(project)
                    setFormOpen(true)
                  }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-elevated hover:text-ink"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    archiveProject.mutate(
                      { id: project.id, isArchived: !project.is_archived },
                      { onError },
                    )
                  }
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-elevated hover:text-ink"
                >
                  {project.is_archived ? (
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                  {project.is_archived ? '恢复' : '归档'}
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setDeleting(project)}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted transition-colors hover:bg-elevated hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectForm
        open={formOpen}
        project={editing}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={deleting != null}
        title="删除项目"
        message={
          deleting
            ? `删除「${deleting.name}」会同时删除其下所有任务，确定继续吗？`
            : undefined
        }
        confirmLabel="删除"
        loading={deleteProject.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteProject.mutate(deleting.id, {
            onSuccess: () => {
              push('项目已删除', 'success')
              setDeleting(null)
            },
            onError: (error) => {
              setDeleting(null)
              onError(error)
            },
          })
        }}
      />
    </div>
  )
}
