import type { SessionSummary } from '../../api/types'
import { formatTime } from '../../lib/format'
import { minutesBetween, sessionState } from '../../lib/sessions'
import { Badge, cn, Icon } from '../ui'

export function FillBar({ ratio }: { ratio: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className={cn('h-full rounded-full', ratio >= 1 ? 'bg-danger' : ratio >= 0.7 ? 'bg-warning' : 'bg-primary')} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  )
}

/** Carte de cours du planning : bloc horaire, nom, coach et salle, état, remplissage. */
export function SessionCard({ session: s, now, onClick }: { session: SessionSummary; now: number; onClick: () => void }) {
  const st = sessionState(s, now)
  const dim = st.key === 'done' || st.key === 'cancelled'
  return (
    <button onClick={onClick} className={cn('flex w-full flex-col gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary-border', dim && 'opacity-65')}>
      <div className="flex gap-4">
        <div
          className={cn(
            'flex h-[72px] w-[68px] shrink-0 flex-col items-center justify-center rounded-[20px] text-white',
            st.key === 'live' ? 'bg-gradient-to-br from-success to-success-ink' : st.key === 'cancelled' ? 'bg-muted' : 'bg-gradient-to-br from-primary to-primary-pressed',
          )}
        >
          <span className="font-head text-xl font-extrabold leading-none tracking-tight">{formatTime(s.startsAt)}</span>
          <span className="mt-1 text-[11px] font-semibold text-white/85">{minutesBetween(s.startsAt, s.endsAt)} min</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 font-head text-lg font-bold leading-snug">{s.classType.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1"><Icon name="sports" size={15} />{s.coach ? `${s.coach.user.firstName} ${s.coach.user.lastName.charAt(0)}.` : 'Sans coach'}</span>
            <span className="inline-flex items-center gap-1"><Icon name="meeting_room" size={15} />{s.room?.name ?? '—'}</span>
          </div>
          <div className="mt-2"><Badge tone={st.tone} dot>{st.label}</Badge></div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-muted">Remplissage</span>
          <span className="font-bold">{s._count.bookings} / {s.capacity} inscrits</span>
        </div>
        <FillBar ratio={st.ratio} />
      </div>
    </button>
  )
}
