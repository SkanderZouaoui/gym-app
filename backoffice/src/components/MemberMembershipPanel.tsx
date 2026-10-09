import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { branchesApi, membershipsApi, plansApi, type Membership } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'
import { useSessionStore, isAdmin } from '../store/session'

const STATUS_LABEL: Record<Membership['status'], string> = {
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé',
}

const STATUS_CLASS: Record<Membership['status'], string> = {
  ACTIVE: 'bg-(--color-success-soft) text-(--color-success-ink)',
  EXPIRED: 'bg-(--color-danger-soft) text-(--color-danger-ink)',
  SUSPENDED: 'bg-(--color-warning-soft) text-(--color-warning-ink)',
  CANCELLED: 'bg-(--color-surface-2) text-(--color-muted)',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MemberMembershipPanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const user = useSessionStore((s) => s.user)
  const canManage = isAdmin(user)

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['memberships', userId],
    queryFn: () => membershipsApi.findForMember(userId),
  })
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: plansApi.findAll })
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.findAll })

  const [createOpen, setCreateOpen] = useState(false)
  const [planId, setPlanId] = useState('')
  const [homeBranchId, setHomeBranchId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [extendingId, setExtendingId] = useState<string | null>(null)
  const [extendDays, setExtendDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['memberships', userId] })

  const create = useMutation({
    mutationFn: membershipsApi.create,
    onSuccess: () => {
      invalidate()
      setCreateOpen(false)
      setPlanId('')
      setHomeBranchId('')
      setStartDate('')
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const renew = useMutation({
    mutationFn: (id: string) => membershipsApi.renew(id, {}),
    onSuccess: invalidate,
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const suspend = useMutation({
    mutationFn: membershipsApi.suspend,
    onSuccess: invalidate,
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const reactivate = useMutation({
    mutationFn: membershipsApi.reactivate,
    onSuccess: invalidate,
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => membershipsApi.cancel(id, reason),
    onSuccess: invalidate,
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const extend = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => membershipsApi.extend(id, days),
    onSuccess: () => {
      invalidate()
      setExtendingId(null)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const handleCancel = (id: string) => {
    const reason = window.prompt('Raison de l\'annulation (optionnel) :') ?? undefined
    if (!window.confirm('Confirmer l\'annulation de cet abonnement ?')) return
    setError(null)
    cancel.mutate({ id, reason: reason || undefined })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-2) p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-(--color-secondary)">Abonnements</h4>
        <button
          onClick={() => setCreateOpen((o) => !o)}
          className="rounded-md bg-(--color-primary) px-3 py-1.5 text-xs font-bold text-white hover:bg-(--color-primary-hover)"
        >
          Nouvel abonnement
        </button>
      </div>

      {error ? <p className="text-sm font-medium text-(--color-danger)">{error}</p> : null}

      {createOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            create.mutate({
              userId,
              planId,
              startDate: startDate || undefined,
              homeBranchId: homeBranchId || undefined,
            })
          }}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-3"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-(--color-muted)">Formule</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
              className="h-9 w-44 rounded-lg border border-(--color-border) px-2 text-sm outline-none focus:border-(--color-primary)"
            >
              <option value="" disabled>
                Choisir…
              </option>
              {(plans ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-(--color-muted)">Site</label>
            <select
              value={homeBranchId}
              onChange={(e) => setHomeBranchId(e.target.value)}
              className="h-9 w-40 rounded-lg border border-(--color-border) px-2 text-sm outline-none focus:border-(--color-primary)"
            >
              <option value="">—</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-(--color-muted)">Début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-36 rounded-lg border border-(--color-border) px-2 text-sm outline-none focus:border-(--color-primary)"
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="h-9 rounded-lg bg-(--color-secondary) px-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Créer
          </button>
        </form>
      ) : null}

      {isLoading ? <p className="text-sm text-(--color-muted)">Chargement…</p> : null}
      {!isLoading && (memberships ?? []).length === 0 ? (
        <p className="text-sm text-(--color-muted)">Aucun abonnement pour ce membre.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {(memberships ?? []).map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) p-3"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{m.plan.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[m.status]}`}>
                  {STATUS_LABEL[m.status]}
                </span>
              </div>
              <span className="text-xs text-(--color-muted)">
                {formatDate(m.startDate)} → {formatDate(m.endDate)}
              </span>
            </div>

            {canManage ? (
              <div className="flex flex-wrap items-center gap-2">
                {m.status === 'ACTIVE' ? (
                  <>
                    {extendingId === m.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          setError(null)
                          extend.mutate({ id: m.id, days: extendDays })
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="number"
                          min={1}
                          value={extendDays}
                          onChange={(e) => setExtendDays(Number(e.target.value))}
                          className="h-8 w-20 rounded-md border border-(--color-border) px-2 text-xs outline-none focus:border-(--color-primary)"
                        />
                        <button
                          type="submit"
                          disabled={extend.isPending}
                          className="rounded-md bg-(--color-primary) px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          OK
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setExtendingId(m.id)
                          setExtendDays(30)
                        }}
                        className="rounded-md border border-(--color-border-strong) px-2.5 py-1.5 text-xs font-bold hover:bg-(--color-surface-2)"
                      >
                        Prolonger
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setError(null)
                        suspend.mutate(m.id)
                      }}
                      className="rounded-md border border-(--color-border-strong) px-2.5 py-1.5 text-xs font-bold hover:bg-(--color-warning-soft) hover:text-(--color-warning-ink)"
                    >
                      Suspendre
                    </button>
                    <button
                      onClick={() => handleCancel(m.id)}
                      className="rounded-md border border-(--color-border-strong) px-2.5 py-1.5 text-xs font-bold hover:bg-(--color-danger-soft) hover:text-(--color-danger-ink)"
                    >
                      Annuler
                    </button>
                  </>
                ) : null}

                {m.status === 'SUSPENDED' ? (
                  <>
                    <button
                      onClick={() => {
                        setError(null)
                        reactivate.mutate(m.id)
                      }}
                      className="rounded-md border border-(--color-border-strong) px-2.5 py-1.5 text-xs font-bold hover:bg-(--color-success-soft) hover:text-(--color-success-ink)"
                    >
                      Réactiver
                    </button>
                    <button
                      onClick={() => handleCancel(m.id)}
                      className="rounded-md border border-(--color-border-strong) px-2.5 py-1.5 text-xs font-bold hover:bg-(--color-danger-soft) hover:text-(--color-danger-ink)"
                    >
                      Annuler
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}

            {m.status === 'EXPIRED' || m.status === 'SUSPENDED' ? (
              <button
                onClick={() => {
                  setError(null)
                  renew.mutate(m.id)
                }}
                disabled={renew.isPending}
                className="rounded-md bg-(--color-secondary) px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Renouveler
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
