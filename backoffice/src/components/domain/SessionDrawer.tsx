import { useMemo, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { useManualCheckin, useRoster } from '../../api/hooks'
import type { RosterEntry, SessionSummary } from '../../api/types'
import { REASON_HINT, REASON_LABEL } from '../../lib/reasons'
import { formatDate, formatTime } from '../../lib/format'
import { minutesBetween, sessionState } from '../../lib/sessions'
import { useNow } from '../../lib/hooks'
import { Avatar, Badge, Card, Drawer, EmptyState, Icon, SectionHeader, Skeleton, Tabs, useToast, Button, cn } from '../ui'
import { FillBar } from './SessionCard'

type Filter = 'all' | 'todo' | 'present'

/**
 * Détail d'un cours (équivalent de l'écran « détail du cours » staff) : informations, présence, liste des inscrits avec
 * pointage manuel, liste d'attente.
 */
export function SessionDrawer({ session, onClose }: { session: SessionSummary; onClose: () => void }) {
  const now = useNow()
  const toast = useToast()
  const st = sessionState(session, now)
  const { data: roster, isLoading } = useRoster(session.id)
  const checkin = useManualCheckin()
  const [filter, setFilter] = useState<Filter>('all')
  const [pending, setPending] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const confirmed = useMemo(() => (roster ?? []).filter((r) => r.status === 'CONFIRMED' || r.status === 'ATTENDED'), [roster])
  const waitlist = (roster ?? []).filter((r) => r.status === 'WAITLISTED')
  const attended = confirmed.filter((r) => r.status === 'ATTENDED').length
  const list = confirmed.filter((r) => (filter === 'all' ? true : filter === 'present' ? r.status === 'ATTENDED' : r.status === 'CONFIRMED'))
  const open = st.key !== 'cancelled'
  const left = Math.max(0, session.capacity - session._count.bookings)

  const check = (payload: { userId?: string; memberCode?: string }, entryId?: string) => {
    setPending(entryId ?? 'code')
    setCodeError(null)
    checkin.mutate(
      { sessionId: session.id, ...payload },
      {
        onSuccess: (o) => {
          if (o.result === 'GRANTED') {
            toast(o.member ? `${o.member.firstName} ${o.member.lastName} est pointé` : 'Présence enregistrée')
            setCode('')
          } else {
            const msg = `${REASON_LABEL[o.reasonCode] ?? o.reasonCode}${REASON_HINT[o.reasonCode] ? ` — ${REASON_HINT[o.reasonCode]}` : ''}`
            if (entryId) toast(msg, 'danger')
            else setCodeError(msg)
          }
        },
        onError: (e) => toast(apiErrorMessage(e, 'Pointage impossible.'), 'danger'),
        onSettled: () => setPending(null),
      },
    )
  }

  const infos = [
    { icon: 'schedule', label: 'Horaire', value: `${formatTime(session.startsAt)} – ${formatTime(session.endsAt)}` },
    { icon: 'timelapse', label: 'Durée', value: `${minutesBetween(session.startsAt, session.endsAt)} min` },
    { icon: 'meeting_room', label: 'Salle', value: session.room?.name ?? '—' },
    { icon: 'event_seat', label: 'Places', value: `${left} libre${left > 1 ? 's' : ''} sur ${session.capacity}` },
  ]

  const row = (r: RosterEntry, withAction: boolean) => {
    const plan = r.user.memberships?.[0]?.plan.name
    return (
      <div key={r.id} className="flex items-center gap-3 px-4 py-3">
        <Avatar firstName={r.user.firstName} lastName={r.user.lastName} photoUrl={r.user.photoUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{r.user.firstName} {r.user.lastName}</div>
          <div className="truncate text-xs text-muted">{[plan, r.user.memberCode ? `Code ${r.user.memberCode}` : null].filter(Boolean).join(' · ') || '—'}</div>
        </div>
        {r.status === 'ATTENDED' ? (
          <Badge tone="success" dot>Présent</Badge>
        ) : withAction && open ? (
          <Button size="sm" variant="soft" icon="how_to_reg" loading={pending === r.id} onClick={() => check({ userId: r.user.id }, r.id)}>Pointer</Button>
        ) : null}
      </div>
    )
  }

  return (
    <Drawer
      title={session.classType.name}
      subtitle={<span>{formatDate(session.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(session.startsAt)}</span>}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={st.tone} dot>{st.label}</Badge>
          {session.coach ? <Badge tone="primary"><Icon name="sports" size={14} />{session.coach.user.firstName} {session.coach.user.lastName}</Badge> : <Badge>Sans coach</Badge>}
          {session.classType.level ? <Badge tone="info">{session.classType.level}</Badge> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {infos.map((i) => (
            <Card key={i.label} className="flex items-center gap-3 p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name={i.icon} size={20} /></span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-muted">{i.label}</div>
                <div className="text-sm font-bold">{i.value}</div>
              </div>
            </Card>
          ))}
        </div>

        {session.classType.description ? (
          <Card className="p-5">
            <div className="mb-1.5 font-head text-base font-bold">À propos du cours</div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{session.classType.description}</p>
          </Card>
        ) : null}

        <Card className="space-y-3 p-5">
          <div className="flex items-end justify-between">
            <div className="font-head text-base font-bold">Présents</div>
            <div className="font-head text-2xl font-extrabold">{attended}<span className="text-base font-bold text-muted"> / {confirmed.length}</span></div>
          </div>
          <FillBar ratio={confirmed.length ? attended / confirmed.length : 0} />
        </Card>

        {open ? (
          <Card className="space-y-2 p-5">
            <div className="font-head text-base font-bold">Pointer avec un code adhérent</div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (code.length === 6) check({ memberCode: code })
              }}
            >
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setCodeError(null)
                }}
                inputMode="numeric"
                placeholder="Code à 6 chiffres"
                aria-label="Code adhérent"
                className={cn('h-11 min-w-0 flex-1 rounded-full border bg-surface px-4 font-head text-lg font-bold tracking-[0.3em] outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-primary', codeError ? 'border-danger' : 'border-border')}
              />
              <Button type="submit" icon="how_to_reg" disabled={code.length !== 6} loading={pending === 'code'}>Pointer</Button>
            </form>
            {codeError ? <p className="flex items-start gap-1.5 text-[13px] font-semibold text-danger-ink"><Icon name="error" size={16} />{codeError}</p> : null}
          </Card>
        ) : null}

        <section className="space-y-3">
          <SectionHeader title="Inscrits" icon="groups" />
          <Tabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tous', count: confirmed.length },
              { value: 'todo', label: 'À pointer', count: confirmed.length - attended },
              { value: 'present', label: 'Présents', count: attended },
            ]}
          />
          <Card className="divide-y divide-border overflow-hidden">
            {isLoading ? (
              <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11" />)}</div>
            ) : confirmed.length === 0 ? (
              <EmptyState icon="group_off" title="Aucun inscrit" hint="Personne n’a encore réservé ce cours." />
            ) : list.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Aucun inscrit dans cette catégorie.</p>
            ) : (
              list.map((r) => row(r, true))
            )}
          </Card>
        </section>

        {waitlist.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader title="Liste d’attente" icon="hourglass_top" />
            <Card className="divide-y divide-border overflow-hidden">{waitlist.map((r) => row(r, false))}</Card>
          </section>
        ) : null}
      </div>
    </Drawer>
  )
}
