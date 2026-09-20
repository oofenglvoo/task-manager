import { cn } from '../../lib/utils'

const SWATCHES = [
  '#5e6ad2',
  '#3b82f6',
  '#06b6d4',
  '#14b8a6',
  '#22c55e',
  '#eab308',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#94a3b8',
  '#6366f1',
]

export function ColorPicker({
  value,
  onChange,
  onClear,
  clearLabel = '默认',
}: {
  value: string
  onChange: (color: string) => void
  onClear?: () => void
  clearLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          onClick={() => onChange(color)}
          className={cn(
            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
            value.toLowerCase() === color ? 'border-ink' : 'border-transparent',
          )}
          style={{ backgroundColor: color }}
        />
      ))}
      <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-line-strong">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          className="pointer-events-none absolute inset-1 rounded-full"
          style={{ backgroundColor: value }}
        />
      </label>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-line bg-surface px-2 py-0.5 text-xs text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  )
}
