import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { PreferencesProvider } from './store/preferences'
import { ToastProvider } from './store/toast'
import { UIProvider } from './store/ui'
import { AppBackground } from './components/layout/AppBackground'
import { AppShell } from './components/layout/AppShell'
import { BoardView } from './components/board/BoardView'
import { ListView } from './components/list/ListView'
import { SettingsView } from './components/settings/SettingsView'
import { DashboardView } from './components/stats/DashboardView'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PreferencesProvider>
          <UIProvider>
            <AppBackground />
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Navigate to="/board" replace />} />
                  <Route path="/board" element={<BoardView />} />
                  <Route path="/list" element={<ListView />} />
                  <Route path="/dashboard" element={<DashboardView />} />
                  <Route path="/settings" element={<SettingsView />} />
                  <Route path="*" element={<Navigate to="/board" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </UIProvider>
        </PreferencesProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
