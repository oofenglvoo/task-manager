import { usePreferences } from '../../store/preferences'

export function AppBackground() {
  const { background } = usePreferences()

  if (!background) return null

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${JSON.stringify(background)})` }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgb(var(--c-canvas) / var(--app-bg-scrim))' }}
      />
    </div>
  )
}
