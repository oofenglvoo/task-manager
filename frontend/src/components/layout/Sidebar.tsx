import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, Columns3, List, Settings, X } from 'lucide-react'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/board', label: '看板', icon: Columns3 },
  { to: '/list', label: '列表', icon: List },
  { to: '/calendar', label: '日历', icon: CalendarDays },
  { to: '/dashboard', label: '仪表盘', icon: BarChart3 },
]

const linkBase =
  'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors'

export function Sidebar() {
  const { sidebarOpen, closeSidebar } = useUI()

  return (
    <>
      <div
        onClick={closeSidebar}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'app-chrome fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-line bg-surface shadow-lg transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-12 items-center gap-2.5 border-b border-line px-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-white shadow-sm">
            任
          </div>
          <span className="flex-1 text-sm font-semibold text-ink">任务管理</span>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="关闭导航"
            className="rounded border border-transparent p-1 text-muted transition-colors hover:bg-elevated hover:text-ink hover:border-line"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-0.5 px-3 py-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                cn(
                  linkBase,
                  isActive
                    ? 'bg-accent-soft text-ink font-medium'
                    : 'text-ink-soft hover:bg-elevated hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="border-t border-line p-3">
          <NavLink
            to="/settings"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                linkBase,
                isActive
                  ? 'bg-accent-soft text-ink font-medium'
                  : 'text-ink-soft hover:bg-elevated hover:text-ink',
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            设置
          </NavLink>
        </div>
      </aside>
    </>
  )
}
