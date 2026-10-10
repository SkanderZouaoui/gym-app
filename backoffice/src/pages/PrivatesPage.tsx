import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coachesApi, coachingSessionsApi, membersApi, type CoachingSessionItem } from '../api/endpoints'
import { Pagination } from '../components/ui/Pagination'
import { usePagination } from '../lib/usePagination'

const STATUS_LABEL: Record<CoachingSessionItem['status'], string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Planifiée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Réalisée',
}
const STATUS_TONE: Record<CoachingSessionItem['status'], string> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CANCELLED: 'danger',
  COMPLETED: 'success',
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function PrivatesPage() {
  const queryClient = useQueryClient()
  const { data: sessions } = useQuery({ queryKey: ['coaching-sessions', 'admin'], queryFn: coachingSessionsApi.findAllForAdmin })
  const { data: coaches } = useQuery({ queryKey: ['coaches'], queryFn: coachesApi.findAll })
  const { data: members } = useQuery({ queryKey: ['members', 'search', ''], queryFn: () => membersApi.search('') })
  const [statusFilter, setStatusFilter] = useState<CoachingSessionItem['status'] | 'Tous'>('Tous')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ coachId: '', memberId: '', date: '', time: '18:00', durationMin: 60, objective: '' })

  const markDone = useMutation({
    mutationFn: coachingSessionsApi.markCompleted,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] }),
  })

  const createSession = useMutation({
    mutationFn: () => {
      const startsAt = new Date(`${form.date}T${form.time}:00`)
      const endsAt = new Date(startsAt.getTime() + form.durationMin * 60_000)
      return coachingSessionsApi.create({
        coachId: form.coachId,
        memberId: form.memberId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        objective: form.objective || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-sessions'] })
      setFormOpen(false)
      setForm({ coachId: '', memberId: '', date: '', time: '18:00', durationMin: 60, objective: '' })
    },
  })

  const filtered = (sessions ?? []).filter((s) => statusFilter === 'Tous' || s.status === statusFilter)
  const { page, pageCount, pageItems, setPage, totalItems, pageSize } = usePagination(filtered)
  const upcoming = (sessions ?? []).filter((s) => s.status === 'CONFIRMED').length
  const done = (sessions ?? []).filter((s) => s.status === 'COMPLETED').length
  const issues = (sessions ?? []).filter((s) => s.status === 'CANCELLED').length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { icon: 'event_upcoming', label: 'À venir', val: upcoming, tone: 'info' },
          { icon: 'task_alt', label: 'Réalisées', val: done, tone: 'success' },
          { icon: 'event_busy', label: 'Annulées', val: issues, tone: 'danger' },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-3.5">
            <span
              className="grid h-9.5 w-9.5 flex-none place-items-center rounded-lg"
              style={{ background: `var(--color-${k.tone}-soft)`, color: `var(--color-${k.tone}-ink)` }}
            >
              <span className="material-symbols-rounded text-[20px]">{k.icon}</span>
            </span>
            <div>
              <div className="font-head text-[22px] font-extrabold leading-none">{k.val}</div>
              <div className="text-[12.5px] text-(--color-muted)">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['Tous', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((s) => {
            const active = s === statusFilter
            const count = s === 'Tous' ? (sessions ?? []).length : (sessions ?? []).filter((x) => x.status === s).length
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`h-8 rounded-full border px-3 text-[13px] font-semibold ${
                  active ? 'border-(--color-secondary) bg-(--color-secondary) text-white' : 'border-(--color-border) bg-(--color-surface)'
                }`}
              >
                {s === 'Tous' ? 'Tous' : STATUS_LABEL[s]} · {count}
              </button>
            )
          })}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-(--color-primary) px-3.5 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover)"
        >
          <span className="material-symbols-rounded text-[18px]">event_available</span>
          Planifier une séance
        </button>
      </div>

      {formOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createSession.mutate()
          }}
          className="grid grid-cols-2 gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 sm:grid-cols-4"
        >
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--color-muted)">
            Adhérent
            <select
              required
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
              className="h-10 rounded-lg border border-(--color-border) px-2.5 text-sm"
            >
              <option value="">Choisir…</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--color-muted)">
            Coach
            <select
              required
              value={form.coachId}
              onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))}
              className="h-10 rounded-lg border border-(--color-border) px-2.5 text-sm"
            >
              <option value="">Choisir…</option>
              {(coaches ?? []).map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.user.firstName} {c.user.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--color-muted)">
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="h-10 rounded-lg border border-(--color-border) px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-(--color-muted)">
            Heure
            <input
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="h-10 rounded-lg border border-(--color-border) px-2.5 text-sm"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5 text-xs font-semibold text-(--color-muted)">
            Objectif
            <input
              value={form.objective}
              onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
              className="h-10 rounded-lg border border-(--color-border) px-2.5 text-sm"
            />
          </label>
          <div className="col-span-2 flex items-end gap-2.5">
            <button
              type="submit"
              disabled={createSession.isPending}
              className="h-10 rounded-lg bg-(--color-secondary) px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Planifier
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[150px_1.3fr_1fr_1fr_110px] gap-3 bg-(--color-surface-2) px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-(--color-muted)">
            <span>Date</span>
            <span>Adhérent</span>
            <span>Coach</span>
            <span>Objectif</span>
            <span>Statut</span>
          </div>
          {pageItems.map((s) => (
            <div key={s.id} className="grid grid-cols-[150px_1.3fr_1fr_1fr_110px] items-center gap-3 border-b border-(--color-border) px-5 py-2.5 last:border-0">
              <div>
                <div className="font-bold">{new Date(s.startsAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                <div className="font-mono text-xs text-(--color-muted)">
                  {new Date(s.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="grid h-8.5 w-8.5 flex-none place-items-center rounded-full bg-(--color-secondary-soft) text-xs font-bold text-(--color-secondary-ink)">
                  {initials(s.member.firstName, s.member.lastName)}
                </span>
                <span className="truncate font-bold">
                  {s.member.firstName} {s.member.lastName}
                </span>
              </div>
              <span className="truncate">
                {s.coach.user.firstName} {s.coach.user.lastName}
              </span>
              <span className="truncate text-(--color-muted)">{s.objective ?? '—'}</span>
              <div className="flex items-center justify-between gap-2">
                <span
                  className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: `var(--color-${STATUS_TONE[s.status]}-soft)`, color: `var(--color-${STATUS_TONE[s.status]}-ink)` }}
                >
                  {STATUS_LABEL[s.status]}
                </span>
                {s.status === 'CONFIRMED' ? (
                  <button
                    onClick={() => markDone.mutate(s.id)}
                    aria-label="Marquer réalisée"
                    className="grid h-7 w-7 flex-none place-items-center rounded-md border border-(--color-success-border) bg-(--color-success-soft) text-(--color-success-ink)"
                  >
                    <span className="material-symbols-rounded text-[16px]">check</span>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13.5px] text-(--color-muted)">Aucune séance.</div>
          ) : null}
        </div>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} totalItems={totalItems} pageSize={pageSize} />
      </div>
    </div>
  )
}
