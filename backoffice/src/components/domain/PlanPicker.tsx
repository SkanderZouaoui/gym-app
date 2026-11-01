import { Icon, cn } from '../ui'
import { formatMoney, METHOD_ICON, METHOD_LABEL, type PaymentMethod } from '../../lib/format'
import { durationLabel } from '../../lib/membership'
import type { Plan } from '../../api/types'
import { useOrgConfig, usePlans } from '../../api/hooks'
import { Skeleton } from '../ui'

/** Choix d'une formule (cartes) — mêmes informations que la sélection mobile : nom, durée, prix, mention « populaire ». */
export function PlanPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const { data: plans, isLoading } = usePlans()
  if (isLoading) return <div className="grid gap-2.5 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {(plans ?? []).map((p: Plan) => {
        const active = p.id === value
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn('relative flex items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left transition', active ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-primary-border')}
          >
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', active ? 'bg-gradient-to-br from-primary to-primary-pressed text-white' : 'bg-surface-2 text-primary-ink')}>
              <Icon name="card_membership" size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-head text-[15px] font-bold">{p.name}</span>
                {p.isPopular ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white">Populaire</span> : null}
              </span>
              <span className="text-[13px] text-muted">{durationLabel(p.durationDays)}</span>
            </span>
            <span className="font-head text-base font-extrabold">{formatMoney(Math.round(Number(p.price)))}</span>
          </button>
        )
      })}
    </div>
  )
}

const ALL_METHODS: PaymentMethod[] = ['CASH', 'OTHER', 'TRANSFER', 'CHECK']

/** Moyens de paiement acceptés par la salle (réglage de la configuration). */
export function MethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  const { data: config } = useOrgConfig()
  const methods = ALL_METHODS.filter((m) => config?.paymentMethods[m] !== false)
  return (
    <div className="flex flex-wrap gap-2">
      {methods.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn('inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition', value === m ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}
        >
          <Icon name={METHOD_ICON[m]} size={18} />
          {METHOD_LABEL[m]}
        </button>
      ))}
    </div>
  )
}
