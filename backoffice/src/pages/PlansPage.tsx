import { useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { useAdminPlans, useOrganizationConfig, useSavePlan, useTogglePlanActive, useUpdateOrganizationConfig, type AdminPlan } from '../api/admin'
import { formatMoney } from '../lib/format'
import { durationLabel } from '../lib/membership'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Icon, Modal, PageHeader, SectionHeader, Skeleton, Stat, TextArea, useToast, cn } from '../components/ui'

const DURATIONS = [
  { label: '1 mois', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '6 mois', days: 180 },
  { label: '1 an', days: 365 },
]

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left hover:border-primary-border">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-border-strong')}>
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

function PlanModal({ plan, onClose }: { plan?: AdminPlan; onClose: () => void }) {
  const toast = useToast()
  const save = useSavePlan()
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [days, setDays] = useState(String(plan?.durationDays ?? 30))
  const [price, setPrice] = useState(plan ? String(Math.round(Number(plan.price))) : '')
  const [includes, setIncludes] = useState(plan?.includesLabel ?? '')
  const [visible, setVisible] = useState(plan?.isVisibleInApp ?? true)
  const [popular, setPopular] = useState(plan?.isPopular ?? false)
  const [error, setError] = useState<string | null>(null)
  const valid = name.trim() && Number(days) >= 1 && price !== '' && Number(price) >= 0

  const submit = () =>
    save.mutate(
      {
        id: plan?.id,
        data: { name: name.trim(), description: description.trim() || undefined, durationDays: Number(days), price: Number(price), includesLabel: includes.trim() || undefined, isPopular: popular, isVisibleInApp: visible },
      },
      {
        onSuccess: () => {
          toast(plan ? 'Forfait enregistré' : 'Forfait créé')
          onClose()
        },
        onError: (e) => setError(apiErrorMessage(e, "Impossible d'enregistrer le forfait.")),
      },
    )

  return (
    <Modal
      title={plan ? 'Modifier le forfait' : 'Nouveau forfait'}
      onClose={onClose}
      width="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button icon="check" disabled={!valid} loading={save.isPending} onClick={submit}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
        <Field label="Nom" icon="card_membership" placeholder="Ex. Gym + cours" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextArea label="Description" icon="notes" placeholder="Ce que comprend le forfait" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="space-y-2">
          <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Durée</div>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button key={d.days} type="button" onClick={() => setDays(String(d.days))} className={cn('h-10 rounded-full px-4 text-sm font-bold transition', Number(days) === d.days ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Durée (jours)" icon="schedule" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
          <Field label="Prix (DT)" icon="payments" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
        </div>
        <Field label="Ce qui est inclus" icon="checklist" placeholder="Ex. Accès libre + cours collectifs" value={includes} onChange={(e) => setIncludes(e.target.value)} />
        <Toggle checked={visible} onChange={setVisible} label="Visible dans l’app" hint="Affiché dans l’écran abonnement des adhérents." />
        <Toggle checked={popular} onChange={setPopular} label="Badge « populaire »" hint="Met le forfait en avant." />
      </div>
    </Modal>
  )
}

/** Remises d'engagement (en %) selon la durée, réglage de la configuration — même écran que « Abonnements » côté mobile. */
function Discounts() {
  const toast = useToast()
  const { data: config } = useOrganizationConfig()
  const save = useUpdateOrganizationConfig()
  const [draft, setDraft] = useState<Record<string, number> | null>(null)
  const discounts = draft ?? config?.discounts ?? {}
  const months = Object.keys(discounts).sort((a, b) => Number(a) - Number(b))
  const set = (m: string, v: number) => setDraft({ ...discounts, [m]: Math.max(0, Math.min(50, v)) })

  if (!config || months.length === 0) return null
  return (
    <section className="space-y-3">
      <SectionHeader title="Remises d’engagement" icon="percent" />
      <Card className="p-5">
        <p className="mb-4 text-sm text-muted">Réduction appliquée selon la durée d’engagement choisie par l’adhérent.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {months.map((m) => (
            <div key={m} className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
              <span className="text-sm font-bold">{m} mois</span>
              <span className="flex items-center gap-2">
                <button onClick={() => set(m, (discounts[m] ?? 0) - 1)} aria-label="Moins" className="grid size-8 place-items-center rounded-full bg-surface hover:bg-primary-soft"><Icon name="remove" size={18} /></button>
                <span className="w-12 text-center font-head font-extrabold">{discounts[m] ?? 0} %</span>
                <button onClick={() => set(m, (discounts[m] ?? 0) + 1)} aria-label="Plus" className="grid size-8 place-items-center rounded-full bg-surface hover:bg-primary-soft"><Icon name="add" size={18} /></button>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            icon="check"
            disabled={!draft}
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                { ...config, discounts },
                {
                  onSuccess: () => {
                    setDraft(null)
                    toast('Remises enregistrées')
                  },
                  onError: (e) => toast(apiErrorMessage(e), 'danger'),
                },
              )
            }
          >
            Enregistrer les remises
          </Button>
        </div>
      </Card>
    </section>
  )
}

export function PlansPage() {
  const { data: plans, isLoading, isError, refetch } = useAdminPlans()
  const toggle = useTogglePlanActive()
  const toast = useToast()
  const [editing, setEditing] = useState<AdminPlan | 'new' | null>(null)

  const active = (plans ?? []).filter((p) => p.isActive)
  const subscribers = active.reduce((n, p) => n + (p.activeSubscribers ?? 0), 0)
  // Revenu mensuel récurrent : prix ramené au mois × abonnés actifs, sur les forfaits actifs.
  const mrr = active.reduce((n, p) => n + (Number(p.price) / Math.max(1, p.durationDays)) * 30 * (p.activeSubscribers ?? 0), 0)

  return (
    <div className="space-y-8">
      <PageHeader title="Abonnements" subtitle="Formules proposées à l’accueil et dans l’application." actions={<Button icon="add" onClick={() => setEditing('new')}>Nouveau forfait</Button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon="card_membership" label="Forfaits actifs" value={active.length} />
        <Stat icon="groups" label="Abonnés actifs" value={subscribers} tone="success" />
        <Stat icon="trending_up" label="Revenu mensuel estimé" value={formatMoney(Math.round(mrr))} tone="info" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : isError ? (
        <Card><ErrorState onRetry={() => void refetch()} /></Card>
      ) : (plans ?? []).length === 0 ? (
        <Card><EmptyState icon="card_membership" title="Aucun forfait" hint="Créez votre première formule pour pouvoir vendre des abonnements." action={<Button icon="add" onClick={() => setEditing('new')}>Nouveau forfait</Button>} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(plans ?? []).map((p) => (
            <Card key={p.id} className={cn('flex flex-col gap-4 p-5', !p.isActive && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-pressed text-white"><Icon name="card_membership" size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 font-head text-lg font-bold leading-snug">{p.name}</div>
                  <div className="text-sm text-muted">{durationLabel(p.durationDays)} · {p.activeSubscribers ?? 0} abonné{(p.activeSubscribers ?? 0) > 1 ? 's' : ''}</div>
                </div>
                <div className="text-right font-head text-xl font-extrabold">{formatMoney(Math.round(Number(p.price)))}</div>
              </div>
              {p.includesLabel || p.description ? <p className="line-clamp-2 text-sm text-muted">{p.includesLabel ?? p.description}</p> : null}
              <div className="flex flex-wrap gap-1.5">
                {p.isPopular ? <Badge tone="primary">Populaire</Badge> : null}
                {p.isVisibleInApp ? <Badge tone="success">Visible dans l’app</Badge> : <Badge>Masqué</Badge>}
                {!p.isActive ? <Badge tone="warning">Désactivé</Badge> : null}
              </div>
              <div className="mt-auto flex gap-2">
                <Button variant="soft" size="sm" icon="edit" className="flex-1" onClick={() => setEditing(p)}>Modifier</Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={p.isActive ? 'pause_circle' : 'play_circle'}
                  loading={toggle.isPending && toggle.variables?.id === p.id}
                  onClick={() => toggle.mutate({ id: p.id, active: !p.isActive }, { onSuccess: () => toast(p.isActive ? 'Forfait désactivé' : 'Forfait réactivé'), onError: (e) => toast(apiErrorMessage(e), 'danger') })}
                >
                  {p.isActive ? 'Désactiver' : 'Réactiver'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Discounts />
      {editing ? <PlanModal plan={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
