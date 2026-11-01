import type { HTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from './cn'

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

/** Titre de section : pastille d'icône, titre Sora Bold, lien d'action à droite (comme SectionHeader mobile). */
export function SectionHeader({ title, icon, action }: { title: string; icon?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon ? (
        <span className="grid size-7 place-items-center rounded-[9px] bg-primary-soft text-primary-ink">
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      <h2 className="min-w-0 flex-1 truncate text-[19px]">{title}</h2>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] leading-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Stat({ icon, label, value, hint, tone = 'primary' }: { icon: string; label: string; value: ReactNode; hint?: string; tone?: 'primary' | 'success' | 'warning' | 'info' }) {
  const tones = {
    primary: 'bg-primary-soft text-primary-ink',
    success: 'bg-success-soft text-success-ink',
    warning: 'bg-warning-soft text-warning-ink',
    info: 'bg-info-soft text-info-ink',
  }
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', tones[tone])}>
        <Icon name={icon} size={24} />
      </span>
      <div className="min-w-0">
        <div className="font-head text-[28px] font-extrabold leading-none tracking-tight">{value}</div>
        <div className="mt-1 text-[13px] font-semibold text-muted">{label}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
    </Card>
  )
}
