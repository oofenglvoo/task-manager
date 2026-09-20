import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { AuthProvider, useAuth } from './store/auth'
import { PreferencesProvider } from './store/preferences'
import { ToastProvider } from './store/toast'
import { UIProvider } from './store/ui'
import { AppBackground } from './components/layout/AppBackground'
import { AppShell } from './components/layout/AppShell'
import { LoginView } from './components/auth/LoginView'
import { BoardView } from './components/board/BoardView'
import { ListView } from './components/list/ListView'
import { SettingsView } from './components/settings/SettingsView'
import { DashboardView } from './components/stats/DashboardView'

const CalendarView = lazy(() =>
  import('./components/calendar/CalendarView').then((module) => ({
    default: module.CalendarView,
  })),
)

function AppRoutes() {
  const { authenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    )
  }

  if (!authenticated) return <LoginView />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="/board" element={<BoardView />} />
          <Route path="/list" element={<ListView />} />
          <Route
            path="/calendar"
            element={
              <Suspense fallback={null}>
                <CalendarView />
              </Suspense>
            }
          />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/board" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PreferencesProvider>
          <AuthProvider>
            <UIProvider>
              <AppBackground />
              <AppRoutes />
            </UIProvider>
          </AuthProvider>
        </PreferencesProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
