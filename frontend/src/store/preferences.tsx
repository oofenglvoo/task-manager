import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import type { CardSize, ThemeMode } from '../lib/types'

export type { CardSize, ThemeMode }

export const CARD_SIZE_MIN: Record<CardSize, string> = {
  sm: '220px',
  md: '280px',
  lg: '360px',
}

export interface CardSizeStyle {
  min: string
  gap: string
  padding: string
  title: string
  descLines: string
  tag: 'compact' | 'subtle'
}

export const CARD_SIZE_STYLES: Record<CardSize, CardSizeStyle> = {
  sm: {
    min: '220px',
    gap: 'gap-3',
    padding: 'p-3',
    title: 'text-sm',
    descLines: 'line-clamp-1',
    tag: 'compact',
  },
  md: {
    min: '280px',
    gap: 'gap-4',
    padding: 'p-4',
    title: 'text-sm',
    descLines: 'line-clamp-2',
    tag: 'subtle',
  },
  lg: {
    min: '360px',
    gap: 'gap-5',
    padding: 'p-5',
    title: 'text-base',
    descLines: 'line-clamp-3',
    tag: 'subtle',
  },
}

interface Preferences {
  theme: ThemeMode
  cardSize: CardSize
  compact: boolean
  background: string | null
}

interface PreferencesState extends Preferences {
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemeMode) => void
  setCardSize: (size: CardSize) => void
  setCompact: (compact: boolean) => void
  setBackground: (background: string | null) => void
}

const STORAGE_KEY = 'task-manager:preferences'

const DEFAULTS: Preferences = {
  theme: 'system',
  cardSize: 'md',
  compact: false,
  background: null,
}

function loadPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Preferences>
    return {
      theme:
        parsed.theme === 'dark' || parsed.theme === 'light' || parsed.theme === 'system'
          ? parsed.theme
          : DEFAULTS.theme,
      cardSize:
        parsed.cardSize === 'sm' || parsed.cardSize === 'md' || parsed.cardSize === 'lg'
          ? parsed.cardSize
          : DEFAULTS.cardSize,
      compact: typeof parsed.compact === 'boolean' ? parsed.compact : DEFAULTS.compact,
      background: typeof parsed.background === 'string' ? parsed.background : null,
    }
  } catch {
    return DEFAULTS
  }
}

const PreferencesContext = createContext<PreferencesState | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences)
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  useEffect(() => {
    let active = true
    api.settings
      .get()
      .then((data) => {
        if (!active) return
        const server = {
          theme: data.theme,
          cardSize: data.card_size,
          compact: data.compact,
          background: data.background_url,
        }
        const isServerDefault =
          data.theme === 'system' &&
          data.card_size === 'md' &&
          !data.compact &&
          data.background_url === null
        const hadLocal = window.localStorage.getItem(STORAGE_KEY) != null
        if (isServerDefault && hadLocal) {
          void api.settings
            .update({
              theme: prefsRef.current.theme,
              card_size: prefsRef.current.cardSize,
              compact: prefsRef.current.compact,
              background_url: prefsRef.current.background,
            })
            .catch(() => {})
          return
        }
        setPrefs(server)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const resolvedTheme: 'dark' | 'light' =
    prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', resolvedTheme === 'light')
    root.classList.toggle('has-app-bg', prefs.background != null)
  }, [resolvedTheme, prefs.background])

  const value = useMemo<PreferencesState>(
    () => ({
      ...prefs,
      resolvedTheme,
      setTheme: (theme) => {
        setPrefs((prev) => ({ ...prev, theme }))
        void api.settings.update({ theme }).catch(() => {})
      },
      setCardSize: (cardSize) => {
        setPrefs((prev) => ({ ...prev, cardSize }))
        void api.settings.update({ card_size: cardSize }).catch(() => {})
      },
      setCompact: (compact) => {
        setPrefs((prev) => ({ ...prev, compact }))
        void api.settings.update({ compact }).catch(() => {})
      },
      setBackground: (background) => {
        setPrefs((prev) => ({ ...prev, background }))
        void api.settings.update({ background_url: background }).catch(() => {})
      },
    }),
    [prefs, resolvedTheme],
  )

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesState {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences 必须在 PreferencesProvider 内使用')
  return ctx
}
