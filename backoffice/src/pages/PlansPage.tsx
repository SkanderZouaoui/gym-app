import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { branchesApi, plansApi, type CreatePlanInput, type MembershipPlan } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'

const ACCESS_SCOPES: CreatePlanInput['accessScope'][] = ['INHERIT', 'HOME_ONLY', 'ALL', 'SELECTED']
const CROSS_BRANCH_MODES: CreatePlanInput['crossBranchBooking'][] = ['INHERIT', 'ENABLED', 'DISABLED']

const emptyForm = {
  name: '',
  description: '',
  durationDays: 30,
  price: 0,
  accessCount: '' as number | '',
  accessScope: 'INHERIT' as NonNullable<CreatePlanInput['accessScope']>,
  crossBranchBooking: 'INHERIT' as NonNullable<CreatePlanInput['crossBranchBooking']>,
  crossBranchMonthlyQuota: '' as number | '',
  isContractual: false,
  branchIds: [] as string[],
}

function toInput(form: typeof emptyForm): CreatePlanInput {
  return {
    name: form.name,
    description: form.description || undefined,
    durationDays: form.durationDays,
    price: form.price,
    accessCount: form.accessCount === '' ? undefined : form.accessCount,
    accessScope: form.accessScope,
    crossBranchBooking: form.crossBranchBooking,
    crossBranchMonthlyQuota: form.crossBranchMonthlyQuota === '' ? undefined : form.crossBranchMonthlyQuota,
    isContractual: form.isContractual,
    branchIds: form.branchIds,
  }
}

function fromPlan(plan: MembershipPlan): typeof emptyForm {
  return {
    name: plan.name,
    description: plan.description ?? '',
    durationDays: plan.durationDays,
    price: Number(plan.price),
    accessCount: plan.accessCount ?? '',
    accessScope: plan.accessScope,
    crossBranchBooking: plan.crossBranchBooking,
    crossBranchMonthlyQuota: plan.crossBranchMonthlyQuota ?? '',
    isContractual: plan.isContractual,
    branchIds: plan.branches.map((b) => b.branchId),
  }
}

export function PlansPage() {
  const queryClient = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: plansApi.findAll })
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.findAll })
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const submitPlan = useMutation({
    mutationFn: (payload: CreatePlanInput) =>
      editingId ? plansApi.update(editingId, payload) : plansApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setFormOpen(false)
      resetForm()
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const deactivate = useMutation({
    mutationFn: plansApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
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

  const toggleBranch = (branchId: string) => {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(branchId)
        ? f.branchIds.filter((id) => id !== branchId)
        : [...f.branchIds, branchId],
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Abonnements et formules</h1>
          <p className="text-sm text-(--color-muted)">Gestion des formules proposées aux adhérents</p>
        </div>
        <button
          onClick={() => (formOpen && !editingId ? setFormOpen(false) : openCreate())}
          className="flex h-10 items-center gap-2 rounded-lg bg-(--color-primary) px-4 text-sm font-bold text-white hover:bg-(--color-primary-hover)"
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
              <label className="text-xs font-semibold text-(--color-muted)">Portée d'accès (sites)</label>
              <select
                value={form.accessScope}
                onChange={(e) => setForm((f) => ({ ...f, accessScope: e.target.value as typeof f.accessScope }))}
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              >
                {ACCESS_SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-(--color-muted)">Réservation inter-sites</label>
              <select
                value={form.crossBranchBooking}
                onChange={(e) => setForm((f) => ({ ...f, crossBranchBooking: e.target.value as typeof f.crossBranchBooking }))}
                className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
              >
                {CROSS_BRANCH_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {form.crossBranchBooking !== 'DISABLED' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-(--color-muted)">Quota mensuel inter-sites</label>
                <input
                  type="number"
                  min={0}
                  value={form.crossBranchMonthlyQuota}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, crossBranchMonthlyQuota: e.target.value === '' ? '' : Number(e.target.value) }))
                  }
                  placeholder="Illimité"
                  className="h-10 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
                />
              </div>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isContractual}
              onChange={(e) => setForm((f) => ({ ...f, isContractual: e.target.checked }))}
              className="h-4 w-4"
            />
            Formule contractuelle (portée d'accès figée à la souscription)
          </label>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-(--color-muted)">Sites éligibles</label>
            <div className="flex flex-wrap gap-3">
              {(branches ?? []).map((b) => (
                <label key={b.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.branchIds.includes(b.id)}
                    onChange={() => toggleBranch(b.id)}
                    className="h-4 w-4"
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(plans ?? []).map((plan) => (
          <div key={plan.id} className="flex flex-col gap-2 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-head text-base font-bold">{plan.name}</h3>
              {!plan.isActive ? (
                <span className="rounded-full bg-(--color-surface-2) px-2 py-0.5 text-xs font-bold text-(--color-muted)">
                  Inactive
                </span>
              ) : null}
            </div>
            <p className="text-2xl font-extrabold text-(--color-primary-ink)">{plan.price} DT</p>
            <p className="text-xs text-(--color-muted)">
              {plan.durationDays} jours · {plan.accessScope}
              {plan.accessCount ? ` · ${plan.accessCount} accès` : ' · accès illimité'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => openEdit(plan)}
                className="self-start rounded-md border border-(--color-border-strong) px-3 py-1.5 text-xs font-bold hover:bg-(--color-surface-2)"
              >
                Modifier
              </button>
              {plan.isActive ? (
                <button
                  onClick={() => deactivate.mutate(plan.id)}
                  className="self-start rounded-md border border-(--color-border-strong) px-3 py-1.5 text-xs font-bold hover:bg-(--color-danger-soft) hover:text-(--color-danger-ink)"
                >
                  Désactiver
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
