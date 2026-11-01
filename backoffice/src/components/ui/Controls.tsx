import { cn } from './cn'
import { Icon } from './Icon'

/** Interrupteur avec libellé et aide (réglages). */
export function ToggleRow({ checked, onChange, label, hint, className }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-surface-2/60', className)}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        {hint ? <span className="block text-[13px] text-muted">{hint}</span> : null}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-border-strong')}>
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

/** Valeur numérique avec boutons − / + (équivalent du « Stepper » mobile). */
export function Stepper({ label, hint, value, unit, min, max, step = 1, onChange }: { label: string; hint?: string; value: number; unit: string; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{label}</div>
        {hint ? <div className="text-[13px] text-muted">{hint}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Diminuer ${label}`} className="grid size-9 place-items-center rounded-full bg-surface-2 hover:bg-primary-soft disabled:opacity-40"><Icon name="remove" size={18} /></button>
        <span className="w-20 text-center font-head text-base font-extrabold">{value} <span className="text-xs font-bold text-muted">{unit}</span></span>
        <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Augmenter ${label}`} className="grid size-9 place-items-center rounded-full bg-surface-2 hover:bg-primary-soft disabled:opacity-40"><Icon name="add" size={18} /></button>
      </div>
    </div>
  )
}

/** Choix parmi quelques options sous forme de pastilles. */
export function ChipChoice<T extends string>({ label, hint, value, options, onChange }: { label: string; hint?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="space-y-2.5 px-5 py-4">
      <div>
        <div className="text-sm font-bold">{label}</div>
        {hint ? <div className="text-[13px] text-muted">{hint}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn('h-10 rounded-full px-4 text-sm font-bold transition', value === o.value ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
