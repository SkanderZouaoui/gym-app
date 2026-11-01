import { useMemo, useState } from 'react'
import { useSessions } from '../api/hooks'
import type { SessionSummary } from '../api/types'
import { addDays, formatDate, sameDay, startOfDay } from '../lib/format'
import { sessionState } from '../lib/sessions'
import { useNow } from '../lib/hooks'
import { Card, EmptyState, ErrorState, Icon, PageHeader, Skeleton, Tabs, cn } from '../components/ui'
import { SessionCard } from '../components/domain/SessionCard'
import { SessionDrawer } from '../components/domain/SessionDrawer'
import { SessionFormModal } from '../components/domain/SessionFormModal'
import { useAuth } from '../store/auth'
import { Button } from '../components/ui'

type Status = 'all' | 'upcoming' | 'full' | 'low'
const DAYS = 14

export function PlanningPage() {
  const now = useNow()
  const [today] = useState(() => startOfDay(new Date()))
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(today, i)), [today])
  const [selected, setSelected] = useState(0)
  const [status, setStatus] = useState<Status>('all')
  const [type, setType] = useState('')
  const [coach, setCoach] = useState('')
  const [open, setOpen] = useState<SessionSummary | null>(null)
  const [creating, setCreating] = useState(false)
  const isAdmin = useAuth((s) => s.activeRole === 'ADMIN')
  const { data: sessions, isLoading, isError, refetch } = useSessions(today, addDays(today, DAYS))

  const day = days[selected]
  const daySessions = useMemo(
    () => (sessions ?? []).filter((s) => sameDay(new Date(s.startsAt), day)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [sessions, day],
  )
  const counts = useMemo(() => days.map((d) => (sessions ?? []).filter((s) => sameDay(new Date(s.startsAt), d) && s.status !== 'CANCELLED').length), [sessions, days])
  const types = useMemo(() => [...new Set(daySessions.map((s) => s.classType.name))].sort(), [daySessions])
  const coaches = useMemo(() => [...new Set(daySessions.map((s) => s.coach?.user.firstName).filter((c): c is string => !!c))].sort(), [daySessions])

  const shown = daySessions.filter((s) => {
    const st = sessionState(s, now)
    if (type && s.classType.name !== type) return false
    if (coach && s.coach?.user.firstName !== coach) return false
    if (status === 'upcoming') return st.key !== 'done'
    if (status === 'full') return s._count.bookings >= s.capacity
    if (status === 'low') return st.key !== 'done' && st.ratio < 0.5
    return true
  })
  const booked = shown.reduce((n, s) => n + s._count.bookings, 0)
  const filtered = status !== 'all' || type || coach

  return (
    <div className="space-y-6">
      <PageHeader title="Planning" subtitle={`Cours collectifs · ${formatDate(day, { month: 'long', year: 'numeric' })}`} actions={isAdmin ? <Button icon="add" onClick={() => setCreating(true)}>Nouveau cours</Button> : undefined} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const active = i === selected
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelected(i)}
              className={cn(
                'relative flex h-[68px] w-[56px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border transition',
                active ? 'border-primary bg-gradient-to-br from-primary to-primary-pressed text-white shadow-primary' : 'border-border bg-surface hover:border-primary-border',
              )}
            >
              <span className={cn('text-[11px] font-semibold capitalize', active ? 'text-white/85' : 'text-muted')}>{formatDate(d, { weekday: 'short' }).replace('.', '')}</span>
              <span className="font-head text-lg font-bold leading-none">{d.getDate()}</span>
              <span className={cn('size-1.5 rounded-full', counts[i] === 0 ? 'opacity-0' : active ? 'bg-white' : 'bg-primary')} />
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={status} onChange={setStatus} options={[{ value: 'all', label: 'Tous' }, { value: 'upcoming', label: 'À venir' }, { value: 'full', label: 'Complets' }, { value: 'low', label: 'Sous-remplis' }]} />
        {types.length > 1 ? (
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type de cours" className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary">
            <option value="">Tous les cours</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        ) : null}
        {coaches.length > 1 ? (
          <select value={coach} onChange={(e) => setCoach(e.target.value)} aria-label="Coach" className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary">
            <option value="">Tous les coachs</option>
            {coaches.map((c) => <option key={c}>{c}</option>)}
          </select>
        ) : null}
        <div className="ml-auto flex items-center gap-3 text-sm font-bold text-primary-ink">
          <Icon name="event" size={18} />
          {shown.length} cours · {booked} inscrit{booked > 1 ? 's' : ''}
          {filtered ? (
            <button
              onClick={() => {
                setStatus('all')
                setType('')
                setCoach('')
              }}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-primary-soft px-2.5 text-xs hover:bg-primary-border/60"
            >
              <Icon name="close" size={14} /> Réinitialiser
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : isError ? (
        <Card><ErrorState onRetry={() => void refetch()} /></Card>
      ) : shown.length === 0 ? (
        <Card><EmptyState icon="event_busy" title="Aucun cours" hint="Aucun cours ne correspond à ce jour ou à ces filtres." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => <SessionCard key={s.id} session={s} now={now} onClick={() => setOpen(s)} />)}
        </div>
      )}

      {open ? <SessionDrawer key={open.id} session={open} onClose={() => setOpen(null)} /> : null}
      {creating ? <SessionFormModal defaultDay={day} onClose={() => setCreating(false)} /> : null}
    </div>
  )
}
