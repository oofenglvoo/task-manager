import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

export function Checkbox({
  checked,
  onChange,
  className,
  disabled,
  ariaLabel,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas disabled:opacity-50',
        checked
          ? 'border-accent bg-accent text-white'
          : 'border-line-strong bg-surface hover:border-accent',
        className,
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : null}
    </button>
  )
}
