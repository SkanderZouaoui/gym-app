import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Icon } from './Icon'
import { cn } from './cn'

/**
 * Champ de saisie au style mobile : libellé en petites capitales, tuile d'icône (pleine si rempli, pâle si vide),
 * bordure pointillée tant qu'il est vide, crayon à droite.
 */
interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  icon?: string
  error?: string
  hint?: string
  trailing?: ReactNode
}

export function Field({ label, icon, error, hint, trailing, className, value, readOnly, ...rest }: FieldProps) {
  const id = useId()
  const filled = value !== undefined && String(value).length > 0
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('px-1 text-[11.5px] font-bold uppercase tracking-wider', error ? 'text-danger-ink' : filled ? 'text-primary-ink' : 'text-muted')}>
        {label}
      </label>
      <div
        className={cn(
          'flex min-h-14 items-center gap-3 rounded-[18px] border-[1.5px] bg-surface pl-2.5 pr-3.5 transition focus-within:border-primary focus-within:shadow-[0_6px_14px_rgba(124,58,237,0.22)]',
          error ? 'border-danger bg-danger-soft' : filled ? 'border-primary-border' : 'border-dashed border-border',
          readOnly && 'bg-surface-2 opacity-80',
        )}
      >
        {icon ? (
          <span className={cn('grid size-[38px] shrink-0 place-items-center rounded-xl', filled ? 'bg-gradient-to-br from-primary to-primary-pressed text-white' : 'bg-primary-soft text-primary-ink')}>
            <Icon name={icon} size={20} />
          </span>
        ) : null}
        <input id={id} value={value} readOnly={readOnly} className="h-12 min-w-0 flex-1 bg-transparent text-base font-semibold text-text outline-none placeholder:font-normal placeholder:text-muted/70" {...rest} />
        {trailing ?? (readOnly ? <Icon name="lock" size={18} className="text-muted" /> : <Icon name="edit" size={18} className={filled ? 'text-primary' : 'text-muted'} />)}
      </div>
      {error ? <p className="flex items-center gap-1 px-1.5 text-[12.5px] font-semibold text-danger-ink"><Icon name="error" size={14} />{error}</p> : hint ? <p className="px-1.5 text-[12.5px] text-muted">{hint}</p> : null}
    </div>
  )
}

export function TextArea({ label, icon, className, value, ...rest }: { label: string; icon?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const filled = value !== undefined && String(value).length > 0
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className={cn('px-1 text-[11.5px] font-bold uppercase tracking-wider', filled ? 'text-primary-ink' : 'text-muted')}>{label}</span>
      <div className={cn('flex gap-3 rounded-[18px] border-[1.5px] bg-surface p-2.5 focus-within:border-primary', filled ? 'border-primary-border' : 'border-dashed border-border')}>
        {icon ? (
          <span className={cn('grid size-[38px] shrink-0 place-items-center rounded-xl', filled ? 'bg-gradient-to-br from-primary to-primary-pressed text-white' : 'bg-primary-soft text-primary-ink')}>
            <Icon name={icon} size={20} />
          </span>
        ) : null}
        <textarea value={value} rows={3} className="min-h-20 flex-1 resize-y bg-transparent py-1.5 text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted/70" {...rest} />
      </div>
    </label>
  )
}

export function SelectField({ label, icon, children, className, value, ...rest }: { label: string; icon?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const filled = value !== undefined && String(value).length > 0
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className={cn('px-1 text-[11.5px] font-bold uppercase tracking-wider', filled ? 'text-primary-ink' : 'text-muted')}>{label}</span>
      <div className={cn('flex min-h-14 items-center gap-3 rounded-[18px] border-[1.5px] bg-surface pl-2.5 pr-3.5 focus-within:border-primary', filled ? 'border-primary-border' : 'border-dashed border-border')}>
        {icon ? (
          <span className={cn('grid size-[38px] shrink-0 place-items-center rounded-xl', filled ? 'bg-gradient-to-br from-primary to-primary-pressed text-white' : 'bg-primary-soft text-primary-ink')}>
            <Icon name={icon} size={20} />
          </span>
        ) : null}
        <select value={value} className="h-12 min-w-0 flex-1 appearance-none bg-transparent text-base font-semibold outline-none" {...rest}>
          {children}
        </select>
        <Icon name="expand_more" size={20} className="text-muted" />
      </div>
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-11 w-full min-w-64 max-w-md flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 focus-within:border-primary">
      <Icon name="search" size={20} className="text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted" />
      {value ? (
        <button onClick={() => onChange('')} aria-label="Effacer" className="grid size-6 place-items-center rounded-full text-muted hover:bg-surface-2">
          <Icon name="close" size={16} />
        </button>
      ) : null}
    </div>
  )
}
