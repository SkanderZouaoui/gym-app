import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { plansApi } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'

export function PlansPage() {
  const queryClient = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: plansApi.findAll })
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [durationDays, setDurationDays] = useState(30)
  const [price, setPrice] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const createPlan = useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setFormOpen(false)
      setName('')
      setDurationDays(30)
      setPrice(0)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const deactivate = useMutation({
    mutationFn: plansApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Abonnements et formules</h1>
          <p className="text-sm text-(--color-muted)">Gestion des formules proposées aux adhérents</p>
        </div>
        <button
          onClick={() => setFormOpen((o) => !o)}
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
            createPlan.mutate({ name, durationDays, price })
          }}
          className="flex flex-wrap items-end gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-(--color-muted)">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-48 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-(--color-muted)">Durée (jours)</label>
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              required
              min={1}
              className="h-10 w-32 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-(--color-muted)">Prix (DT)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
              min={0}
              className="h-10 w-32 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
            />
          </div>
          {error ? <p className="w-full text-sm font-medium text-(--color-danger)">{error}</p> : null}
          <button
            type="submit"
            disabled={createPlan.isPending}
            className="h-10 rounded-lg bg-(--color-secondary) px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            Créer
          </button>
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
            <p className="text-xs text-(--color-muted)">{plan.durationDays} jours · {plan.accessScope}</p>
            {plan.isActive ? (
              <button
                onClick={() => deactivate.mutate(plan.id)}
                className="mt-2 self-start rounded-md border border-(--color-border-strong) px-3 py-1.5 text-xs font-bold hover:bg-(--color-danger-soft) hover:text-(--color-danger-ink)"
              >
                Désactiver
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
