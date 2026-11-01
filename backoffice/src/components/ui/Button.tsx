import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from './cn'

type Variant = 'primary' | 'soft' | 'outline' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-br from-primary to-primary-pressed text-primary-contrast shadow-primary hover:brightness-110 active:scale-[0.98]',
  soft: 'bg-primary-soft text-primary-ink hover:bg-primary-border/60 active:scale-[0.98]',
  outline: 'border border-border-strong bg-surface text-text hover:bg-surface-2 active:scale-[0.98]',
  danger: 'border border-danger/30 bg-danger-soft text-danger-ink hover:bg-danger/15 active:scale-[0.98]',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
}
const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-full px-3.5 text-[13px]',
  md: 'h-11 gap-2 rounded-full px-5 text-sm',
  lg: 'h-13 gap-2 rounded-full px-6 text-[15px]',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: string
  loading?: boolean
  children?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, loading, disabled, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-bold transition disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Icon name="progress_activity" size={18} className="animate-spin" /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, className, ...rest }: { icon: string; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text', className)}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  )
}
