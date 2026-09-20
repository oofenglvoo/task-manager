import { useState } from 'react'
import type { FormEvent } from 'react'
import { LogIn } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import { useAuth } from '../../store/auth'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Input'

export function LoginView() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="app-surface-panel w-full max-w-sm space-y-5 rounded-xl border border-line bg-surface p-6 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-sm">
            任
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink">任务管理系统</h1>
            <p className="text-xs text-muted">请登录后继续</p>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="用户名">
            <Input
              value={username}
              autoFocus
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入用户名"
            />
          </Field>
          <Field label="密码">
            <Input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
            />
          </Field>
        </div>

        {error ? (
          <p className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          disabled={submitting || !username.trim() || !password}
        >
          <LogIn className="h-4 w-4" />
          {submitting ? '登录中…' : '登录'}
        </Button>
      </form>
    </div>
  )
}
