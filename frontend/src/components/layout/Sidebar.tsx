import { NavLink } from 'react-router-dom'
import { BarChart3, Columns3, List, Settings, X } from 'lucide-react'
import { useUI } from '../../store/ui'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/board', label: '看板', icon: Columns3 },
  { to: '/list', label: '列表', icon: List },
  { to: '/dashboard', label: '仪表盘', icon: BarChart3 },
]

export function Sidebar() {
  const { sidebarOpen, closeSidebar } = useUI()

  return (
    <>
      <div
        onClick={closeSidebar}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'app-chrome fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-line bg-surface shadow-panel transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-bold text-white">
            任
          </div>
          <span className="flex-1 text-sm font-semibold text-ink">任务管理</span>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded border border-line bg-surface p-1 text-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-0.5 px-2 py-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded px-2.5 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-ink-soft hover:bg-elevated hover:text-ink',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="border-t border-line p-2">
          <NavLink
            to="/settings"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded px-2.5 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-white'
                  : 'text-ink-soft hover:bg-elevated hover:text-ink',
              )
            }
          >
            <Settings className="h-4 w-4" />
            设置
          </NavLink>
        </div>
      </aside>
    </>
  )
}
