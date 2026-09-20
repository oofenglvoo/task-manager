import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '../lib/api'

interface AuthState {
  /** 是否已登录。 */
  authenticated: boolean
  username: string | null
  /** 首次查询会话期间为 true，用于避免闪一下登录页。 */
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const session = await api.auth.session()
      setAuthenticated(session.authenticated)
      setUsername(session.username)
    } catch {
      setAuthenticated(false)
      setUsername(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // 任意业务接口返回 401 时，统一切回登录页。
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthenticated(false)
      setUsername(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (user: string, password: string) => {
    const session = await api.auth.login(user, password)
    setAuthenticated(session.authenticated)
    setUsername(session.username)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } finally {
      setAuthenticated(false)
      setUsername(null)
    }
  }, [])

  const value = useMemo(
    () => ({ authenticated, username, loading, login, logout }),
    [authenticated, username, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
