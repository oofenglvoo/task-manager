import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary:
    'bg-elevated text-ink border border-line hover:border-line-strong hover:bg-surface',
  ghost: 'text-ink-soft hover:text-ink hover:bg-elevated',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  icon: 'h-8 w-8 justify-center',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center rounded font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
