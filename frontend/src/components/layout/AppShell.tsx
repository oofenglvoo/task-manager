import { Outlet } from 'react-router-dom'
import { useTask } from '../../hooks/queries'
import { useUI } from '../../store/ui'
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer'
import { TaskForm } from '../tasks/TaskForm'
import { Toaster } from '../ui/Toaster'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const {
    createOpen,
    closeCreate,
    createStatusId,
    projectId,
    editTaskId,
    closeEdit,
  } = useUI()
  const { data: editTask } = useTask(editTaskId)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar />
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      <Sidebar />
      <TaskDetailDrawer />
      <TaskForm
        open={createOpen}
        onClose={closeCreate}
        defaultStatusId={createStatusId}
        defaultProjectId={projectId}
      />
      <TaskForm
        open={editTaskId != null}
        task={editTask ?? null}
        onClose={closeEdit}
      />
      <Toaster />
    </div>
  )
}
