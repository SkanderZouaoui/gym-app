import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { plansApi, type CreatePlanInput, type MembershipPlan } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'
import { Switch } from '../components/ui/Switch'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'

const emptyForm = {
  name: '',
  description: '',
  durationDays: 30,
  price: 0,
  accessCount: '' as number | '',
  isContractual: false,
  includesLabel: 'Accès libre',
  isPopular: false,
}

function toInput(form: typeof emptyForm): CreatePlanInput {
  return {
    name: form.name,
    description: form.description || undefined,
    durationDays: form.durationDays,
    price: form.price,
    accessCount: form.accessCount === '' ? undefined : form.accessCount,
    isContractual: form.isContractual,
    includesLabel: form.includesLabel || undefined,
    isPopular: form.isPopular,
  }
}

function fromPlan(plan: MembershipPlan): typeof emptyForm {
  return {
    name: plan.name,
    description: plan.description ?? '',
    durationDays: plan.durationDays,
    price: Number(plan.price),
    accessCount: plan.accessCount ?? '',
    isContractual: plan.isContractual,
    includesLabel: plan.includesLabel ?? '',
    isPopular: plan.isPopular,
  }
}

export function PlansPage() {
  const queryClient = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans', 'admin'], queryFn: plansApi.findAllForAdmin })
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(plans ?? [])
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['plans'] })

  const submitPlan = useMutation({
    mutationFn: (payload: CreatePlanInput) =>
      editingId ? plansApi.update(editingId, payload) : plansApi.create(payload),
    onSuccess: () => {
      invalidate()
      setFormOpen(false)
      resetForm()
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const toggleActive = useMutation({
    mutationFn: (plan: MembershipPlan) => (plan.isActive ? plansApi.deactivate(plan.id) : plansApi.reactivate(plan.id)),
    onSuccess: invalidate,
  })

  const toggleVisible = useMutation({
    mutationFn: (plan: MembershipPlan) => plansApi.update(plan.id, { isVisibleInApp: !plan.isVisibleInApp }),
    onSuccess: invalidate,
  })

  const openCreate = () => {
    resetForm()
    setError(null)
    setFormOpen(true)
  }

  const openEdit = (plan: MembershipPlan) => {
    setForm(fromPlan(plan))
    setEditingId(plan.id)
    setError(null)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[13px] text-(--color-muted)">
          <span className="material-symbols-rounded text-[18px]">info</span>
          Aucun paiement dans l’app : la souscription se règle à l’accueil.
        </span>
        <button
          onClick={() => (formOpen && !editingId ? setFormOpen(false) : openCreate())}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover)"
        >
          <span className="material-symbols-rounded text-[18px]">add</span>
          Nouvelle formule
        </button>
      </div>

      {formOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            submitPlan.mutate(toInput(form))
          }}
          className="flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-(--color-muted)">Nom</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-(--color-muted)">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-(--color-muted)">Durée (jours)</label>
              <input
                type="number"
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
                required
                min={1}
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-(--color-muted)">Prix (DT)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                required
                min={0}
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-(--color-muted)">Nombre d'accès (vide = illimité)</label>
              <input
                type="number"
                min={1}
                value={form.accessCount}
                onChange={(e) => setForm((f) => ({ ...f, accessCount: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder="Illimité"
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-(--color-muted)">Ce qui est inclus (affiché dans l'app)</label>
              <input
                value={form.includesLabel}
                onChange={(e) => setForm((f) => ({ ...f, includesLabel: e.target.value }))}
                placeholder="Accès libre + 2 invitations / mois"
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isContractual}
              onChange={(e) => setForm((f) => ({ ...f, isContractual: e.target.checked }))}
              className="h-4 w-4"
            />
            Formule contractuelle
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
              className="h-4 w-4"
            />
            Marquer comme formule « Populaire »
          </label>

          {error ? <p className="text-sm font-medium text-(--color-danger)">{error}</p> : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitPlan.isPending}
              className="h-10 rounded-lg bg-(--color-secondary) px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false)
                  resetForm()
                }}
                className="h-10 rounded-lg border border-(--color-border-strong) px-4 text-sm font-bold"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="grid grid-cols-[1.3fr_130px_100px_1.2fr_90px_80px] gap-3 bg-(--color-surface-2) px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-(--color-muted)">
          <span>Formule</span>
          <span>Prix (DT)</span>
          <span>Durée</span>
          <span>Inclus</span>
          <span>Visible app</span>
          <span>Active</span>
        </div>
        {pageItems.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[1.3fr_130px_100px_1.2fr_90px_80px] items-center gap-3 border-b border-(--color-border) px-5 py-2.5 last:border-0"
            style={{ opacity: p.isActive ? 1 : 0.6 }}
          >
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(p)} className="truncate text-start font-bold hover:underline">
                {p.name}
              </button>
              {p.isPopular ? (
                <span className="rounded-full bg-(--color-accent-soft) px-2 py-0.5 text-[11px] font-bold text-(--color-accent-ink)">
                  Populaire
                </span>
              ) : null}
            </div>
            <span className="font-bold">{Number(p.price)} DT</span>
            <span>{p.durationDays} j</span>
            <span className="truncate text-(--color-muted)">{p.includesLabel ?? (p.accessCount ? `${p.accessCount} accès` : 'Accès illimité')}</span>
            <div className="grid place-items-start">
              <Switch checked={p.isVisibleInApp} onChange={() => toggleVisible.mutate(p)} />
            </div>
            <div className="grid place-items-start">
              <Switch checked={p.isActive} onChange={() => toggleActive.mutate(p)} />
            </div>
          </div>
        ))}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </div>
    </div>
  )
}
