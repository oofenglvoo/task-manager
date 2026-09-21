import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
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

/**
 * 偏好必须能覆盖登录页（主题/背景/不透明度），但 `/api/settings` 是受保护接口，
 * 只有登录后才能拉取。所以把 AuthProvider 放在外层，这里只负责把登录态透传下去：
 * 未登录时 PreferencesProvider 不发请求，登录成功后自动重新拉取。
 */
function PreferencesProviderGate({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth()
  return <PreferencesProvider authenticated={authenticated}>{children}</PreferencesProvider>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <PreferencesProviderGate>
            <UIProvider>
              <AppBackground />
              <AppRoutes />
            </UIProvider>
          </PreferencesProviderGate>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
