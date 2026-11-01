import { cn } from './cn'

/** Sélecteur segmenté (filtres, onglets). */
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1.5 rounded-full bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn('inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-bold transition', value === o.value ? 'bg-surface text-primary-ink shadow-card' : 'text-muted hover:text-text')}
        >
          {o.label}
          {o.count !== undefined ? <span className={cn('rounded-full px-1.5 text-[11px]', value === o.value ? 'bg-primary-soft' : 'bg-border')}>{o.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
