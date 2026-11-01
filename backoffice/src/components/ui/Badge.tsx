import type { ReactNode } from 'react'
import { cn } from './cn'

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
const TONES: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-ink',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  muted: 'bg-surface-2 text-muted',
}

export function Badge({ tone = 'muted', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-bold', TONES[tone], className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}
