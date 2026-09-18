import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { ToastProvider } from './store/toast'
import { UIProvider } from './store/ui'
import { AppShell } from './components/layout/AppShell'
import { BoardView } from './components/board/BoardView'
import { ListView } from './components/list/ListView'
import { ProjectsView } from './components/projects/ProjectsView'
import { SettingsView } from './components/settings/SettingsView'
import { DashboardView } from './components/stats/DashboardView'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <UIProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/board" replace />} />
                <Route path="/board" element={<BoardView />} />
                <Route path="/list" element={<ListView />} />
                <Route path="/dashboard" element={<DashboardView />} />
                <Route path="/projects" element={<ProjectsView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="*" element={<Navigate to="/board" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </UIProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
