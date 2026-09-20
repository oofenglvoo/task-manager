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
  groupBy: boolean
  background: string | null
  bgOpacity: number
  cardOpacity: number
  panelOpacity: number
}

interface PreferencesState extends Preferences {
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemeMode) => void
  setCardSize: (size: CardSize) => void
  setCompact: (compact: boolean) => void
  setGroupBy: (groupBy: boolean) => void
  setBackground: (background: string | null) => void
  setBgOpacity: (value: number) => void
  setCardOpacity: (value: number) => void
  setPanelOpacity: (value: number) => void
}

const STORAGE_KEY = 'task-manager:preferences'

// 在 React 首次渲染、任何 effect 写回 localStorage 之前读取原始记录。
// 只有本机确实存过用户设置时才为 true，避免新机默认值把服务器设置覆盖掉。
const HAD_LOCAL_ON_LOAD = window.localStorage.getItem(STORAGE_KEY) != null

const DEFAULTS: Preferences = {
  theme: 'system',
  cardSize: 'md',
  compact: false,
  groupBy: false,
  background: null,
  bgOpacity: 0.7,
  cardOpacity: 1,
  panelOpacity: 0.82,
}

function clampOpacity(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(1, Math.max(0, value))
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
      groupBy: typeof parsed.groupBy === 'boolean' ? parsed.groupBy : DEFAULTS.groupBy,
      background: typeof parsed.background === 'string' ? parsed.background : null,
      bgOpacity: clampOpacity(parsed.bgOpacity, DEFAULTS.bgOpacity),
      cardOpacity: clampOpacity(parsed.cardOpacity, DEFAULTS.cardOpacity),
      panelOpacity: clampOpacity(parsed.panelOpacity, DEFAULTS.panelOpacity),
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
          groupBy: data.group_by,
          background: data.background_url,
          bgOpacity: data.bg_opacity,
          cardOpacity: data.card_opacity,
          panelOpacity: data.panel_opacity,
        }
        const isServerDefault =
          data.theme === 'system' &&
          data.card_size === 'md' &&
          !data.compact &&
          !data.group_by &&
          data.background_url === null
        if (isServerDefault && HAD_LOCAL_ON_LOAD) {
          void api.settings
            .update({
              theme: prefsRef.current.theme,
              card_size: prefsRef.current.cardSize,
              compact: prefsRef.current.compact,
              group_by: prefsRef.current.groupBy,
              background_url: prefsRef.current.background,
              bg_opacity: prefsRef.current.bgOpacity,
              card_opacity: prefsRef.current.cardOpacity,
              panel_opacity: prefsRef.current.panelOpacity,
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
    root.style.setProperty('--app-bg-scrim', String(prefs.bgOpacity))
    root.style.setProperty('--app-card-alpha', String(prefs.cardOpacity))
    root.style.setProperty('--app-panel-alpha', String(prefs.panelOpacity))
  }, [
    resolvedTheme,
    prefs.background,
    prefs.bgOpacity,
    prefs.cardOpacity,
    prefs.panelOpacity,
  ])

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
      setGroupBy: (groupBy) => {
        setPrefs((prev) => ({ ...prev, groupBy }))
        void api.settings.update({ group_by: groupBy }).catch(() => {})
      },
      setBackground: (background) => {
        setPrefs((prev) => ({ ...prev, background }))
        void api.settings.update({ background_url: background }).catch(() => {})
      },
      setBgOpacity: (bgOpacity) => {
        setPrefs((prev) => ({ ...prev, bgOpacity }))
        void api.settings.update({ bg_opacity: bgOpacity }).catch(() => {})
      },
      setCardOpacity: (cardOpacity) => {
        setPrefs((prev) => ({ ...prev, cardOpacity }))
        void api.settings.update({ card_opacity: cardOpacity }).catch(() => {})
      },
      setPanelOpacity: (panelOpacity) => {
        setPrefs((prev) => ({ ...prev, panelOpacity }))
        void api.settings.update({ panel_opacity: panelOpacity }).catch(() => {})
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
