import { LogOut } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { Button } from '../ui/Button'

export function AccountSettings() {
  const { username, logout } = useAuth()

  return (
    <section className="rounded-xl border border-line bg-surface shadow-sm">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">账号</h2>
        <p className="mt-1 text-xs text-muted">当前登录账号与退出登录</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
        <div>
          <p className="text-sm text-ink-soft">
            当前账号：<span className="font-medium text-ink">{username ?? '未知'}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            退出后需要重新输入用户名和密码才能访问。
          </p>
        </div>
        <Button variant="secondary" size="md" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </div>
    </section>
  )
}
