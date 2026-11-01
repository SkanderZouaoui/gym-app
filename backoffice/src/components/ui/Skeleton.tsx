import { cn } from './cn'
import { Icon } from './Icon'
import type { ReactNode } from 'react'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />
}

export function EmptyState({ icon = 'inbox', title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
        <Icon name={icon} size={28} />
      </span>
      <div className="font-head text-base font-bold">{title}</div>
      {hint ? <p className="max-w-sm text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message = 'Impossible de charger les données.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud_off"
      title={message}
      action={
        onRetry ? (
          <button onClick={onRetry} className="rounded-full bg-primary-soft px-4 py-2 text-sm font-bold text-primary-ink hover:bg-primary-border/60">
            Réessayer
          </button>
        ) : undefined
      }
    />
  )
}
