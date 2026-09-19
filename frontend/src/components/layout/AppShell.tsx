import { Outlet } from 'react-router-dom'
import { useUI } from '../../store/ui'
import { GroupManager } from '../board/GroupManager'
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer'
import { TaskForm } from '../tasks/TaskForm'
import { Modal } from '../ui/Modal'
import { Toaster } from '../ui/Toaster'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const { createOpen, closeCreate, createStatusId, groupsOpen, closeGroups } = useUI()

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
      />
      <Modal open={groupsOpen} title="分组管理" onClose={closeGroups}>
        <GroupManager />
      </Modal>
      <Toaster />
    </div>
  )
}
