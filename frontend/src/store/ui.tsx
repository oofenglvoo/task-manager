import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface UIState {
  search: string
  setSearch: (value: string) => void
  priority: number | null
  setPriority: (value: number | null) => void
  tagId: number | null
  setTagId: (value: number | null) => void
  selectedTaskId: number | null
  openTask: (id: number) => void
  closeTask: () => void
  createOpen: boolean
  createStatusId: number | null
  openCreate: (statusId?: number | null) => void
  closeCreate: () => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  groupsOpen: boolean
  openGroups: () => void
  closeGroups: () => void
}

const UIContext = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<number | null>(null)
  const [tagId, setTagId] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStatusId, setCreateStatusId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)

  const value = useMemo<UIState>(
    () => ({
      search,
      setSearch,
      priority,
      setPriority,
      tagId,
      setTagId,
      selectedTaskId,
      openTask: setSelectedTaskId,
      closeTask: () => setSelectedTaskId(null),
      createOpen,
      createStatusId,
      openCreate: (statusId: number | null = null) => {
        setCreateStatusId(statusId)
        setCreateOpen(true)
      },
      closeCreate: () => setCreateOpen(false),
      sidebarOpen,
      toggleSidebar: () => setSidebarOpen((prev) => !prev),
      closeSidebar: () => setSidebarOpen(false),
      groupsOpen,
      openGroups: () => setGroupsOpen(true),
      closeGroups: () => setGroupsOpen(false),
    }),
    [
      search,
      priority,
      tagId,
      selectedTaskId,
      createOpen,
      createStatusId,
      sidebarOpen,
      groupsOpen,
    ],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI(): UIState {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI 必须在 UIProvider 内使用')
  return ctx
}
