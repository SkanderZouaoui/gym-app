import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAdminDashboard, useExpiringMemberships, usePayments, useStaffToday } from '../api/hooks'
import { useDailyAttendance, useSetupAlerts, webRoute } from '../api/admin'
import { useAuth } from '../store/auth'
import { daysLeft, formatDate, formatMoney, formatTime, greeting, METHOD_ICON, METHOD_LABEL, sameDay } from '../lib/format'
import { useNow } from '../lib/hooks'
import { Avatar, Badge, Card, EmptyState, Icon, SectionHeader, Skeleton, Stat } from '../components/ui'
import { FillBar } from '../components/domain/SessionCard'

export function DashboardPage() {
  const user = useAuth((s) => s.user)
  const isAdmin = useAuth((s) => s.activeRole === 'ADMIN')
  const now = useNow()
  const today = useStaffToday()
  const dashboard = useAdminDashboard(isAdmin)
  const payments = usePayments()
  const expiring = useExpiringMemberships(isAdmin)
  const attendance = useDailyAttendance(isAdmin)
  const setup = useSetupAlerts(isAdmin)

  const todayPayments = useMemo(() => (payments.data ?? []).filter((p) => sameDay(new Date(p.recordedAt), new Date(now))), [payments.data, now])
  const collectedToday = isAdmin && dashboard.data ? Number(dashboard.data.revenueToday) : todayPayments.reduce((n, p) => n + Number(p.amount), 0)
  const sessions = today.data?.sessions ?? []
  const upcoming = sessions.filter((s) => new Date(s.endsAt).getTime() > now)

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#8B5CF6] via-primary to-[#3b1764] p-7 text-white shadow-primary sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-40 size-56 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-sm font-semibold capitalize text-white/75">{formatDate(new Date(now), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1 className="mt-1 text-[32px] leading-tight">{greeting(new Date(now))}, {user?.firstName}</h1>
            <p className="mt-1 max-w-md text-white/80">{isAdmin ? 'Voici l’activité de votre salle aujourd’hui.' : 'Voici votre journée à l’accueil.'}</p>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">{isAdmin ? 'Encaissé aujourd’hui' : 'Vous avez encaissé aujourd’hui'}</div>
            <div className="font-head text-[40px] font-extrabold leading-none">{payments.isLoading ? '…' : formatMoney(collectedToday)}</div>
            <div className="mt-1 text-sm text-white/80">{(isAdmin ? dashboard.data?.paymentsToday : undefined) ?? todayPayments.length} encaissement{((isAdmin ? dashboard.data?.paymentsToday : undefined) ?? todayPayments.length) > 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="event" label="Cours aujourd’hui" value={isAdmin && dashboard.data ? dashboard.data.classesToday : sessions.length} tone="primary" />
        <Stat icon="how_to_reg" label="Présents aujourd’hui" value={isAdmin && dashboard.data ? dashboard.data.attendanceToday : (today.data?.attendedToday ?? 0)} tone="success" />
        {isAdmin ? (
          <>
            <Stat icon="groups" label="Adhérents actifs" value={dashboard.data?.activeMembers ?? '…'} hint={dashboard.data?.newMembersToday ? `+${dashboard.data.newMembersToday} aujourd’hui` : undefined} tone="info" />
            <Stat icon="trending_up" label="Remplissage moyen" value={dashboard.data ? `${Math.round(dashboard.data.avgFillRate)} %` : '…'} hint={dashboard.data ? `${formatMoney(dashboard.data.revenueMonth)} ce mois` : undefined} tone="warning" />
          </>
        ) : (
          <>
            <Stat icon="schedule" label="Cours à venir" value={upcoming.length} tone="info" />
            <Stat icon="receipt_long" label="Encaissements du jour" value={todayPayments.length} tone="warning" />
          </>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-5">
        <section className="space-y-3 xl:col-span-3">
          <SectionHeader
            title="Cours du jour"
            icon="event"
            action={<Link to="/planning" className="inline-flex items-center gap-0.5 text-sm font-bold text-primary-ink hover:underline">Voir le planning <Icon name="chevron_right" size={18} /></Link>}
          />
          <Card className="divide-y divide-border overflow-hidden">
            {today.isLoading ? (
              <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : sessions.length === 0 ? (
              <EmptyState icon="event_busy" title="Aucun cours aujourd’hui" hint="Les cours planifiés pour la journée apparaîtront ici." />
            ) : (
              (upcoming.length > 0 ? upcoming : sessions).map((s) => {
                const full = s.booked >= s.capacity
                return (
                  <Link key={s.id} to="/planning" className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-primary-soft/40">
                    <div className="grid h-12 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-pressed font-head text-base font-extrabold text-white">{formatTime(s.startsAt)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{s.classTypeName}</div>
                      <div className="truncate text-[13px] text-muted">{[s.coachName, s.room].filter(Boolean).join(' · ') || 'Cours collectif'}</div>
                    </div>
                    <div className="w-32 space-y-1.5">
                      <div className="flex justify-between text-xs font-bold"><span>{s.booked}/{s.capacity}</span><span className="text-muted">{s.fillRate} %</span></div>
                      <FillBar ratio={s.capacity ? s.booked / s.capacity : 0} />
                    </div>
                    <Badge tone={full ? 'danger' : s.fillRate >= 70 ? 'warning' : 'muted'}>{full ? 'Complet' : `${s.fillRate} %`}</Badge>
                  </Link>
                )
              })
            )}
          </Card>
        </section>

        <section className="space-y-3 xl:col-span-2">
          <SectionHeader
            title={isAdmin ? 'Derniers encaissements' : 'Mes derniers encaissements'}
            icon="payments"
            action={<Link to="/cash" className="inline-flex items-center gap-0.5 text-sm font-bold text-primary-ink hover:underline">Tout voir <Icon name="chevron_right" size={18} /></Link>}
          />
          <Card className="divide-y divide-border overflow-hidden">
            {payments.isLoading ? (
              <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (payments.data ?? []).length === 0 ? (
              <EmptyState icon="payments" title="Aucun encaissement" hint="Les ventes d’abonnements s’afficheront ici." />
            ) : (
              (payments.data ?? []).slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar firstName={p.membership.user.firstName} lastName={p.membership.user.lastName} photoUrl={p.membership.user.photoUrl} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{p.membership.user.firstName} {p.membership.user.lastName}</div>
                    <div className="flex items-center gap-1 truncate text-xs text-muted"><Icon name={METHOD_ICON[p.method]} size={14} />{METHOD_LABEL[p.method]} · {p.membership.plan.name}</div>
                  </div>
                  <div className="font-head text-sm font-extrabold">{formatMoney(p.amount)}</div>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>

      {isAdmin && (setup.data ?? []).length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="À configurer" icon="checklist" />
          <Card className="divide-y divide-border overflow-hidden">
            {(setup.data ?? []).map((a) => (
              <Link key={a.key} to={webRoute(a.route)} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-primary-soft/40">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${a.severity === 'danger' ? 'bg-danger-soft text-danger-ink' : a.severity === 'warning' ? 'bg-warning-soft text-warning-ink' : 'bg-info-soft text-info-ink'}`}><Icon name={a.severity === 'info' ? 'info' : 'warning'} size={22} /></span>
                <div className="min-w-0 flex-1"><div className="text-sm font-bold">{a.title}</div><div className="truncate text-[13px] text-muted">{a.detail}</div></div>
                <Icon name="chevron_right" size={20} className="text-muted" />
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      {isAdmin && attendance.data ? (
        <section className="space-y-3">
          <SectionHeader title="Présences — 7 derniers jours" icon="bar_chart" action={<Badge tone={attendance.data.changePercent >= 0 ? 'success' : 'danger'}>{attendance.data.changePercent >= 0 ? '+' : ''}{Math.round(attendance.data.changePercent)} % vs semaine précédente</Badge>} />
          <Card className="p-6">
            <div className="flex h-40 items-end gap-3">
              {(() => {
                const max = Math.max(1, ...attendance.data.days.map((d) => d.count))
                return attendance.data.days.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-bold">{d.count}</span>
                    <div className="w-full max-w-14 rounded-t-xl bg-gradient-to-t from-primary to-[#8B5CF6]" style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, opacity: d.count === 0 ? 0.25 : 1 }} />
                    <span className="text-xs capitalize text-muted">{formatDate(d.date, { weekday: 'short' }).replace('.', '')}</span>
                  </div>
                ))
              })()}
            </div>
            <div className="mt-4 text-sm text-muted">{attendance.data.currentWeekTotal} présence{attendance.data.currentWeekTotal > 1 ? 's' : ''} cette semaine · {attendance.data.previousWeekTotal} la semaine précédente</div>
          </Card>
        </section>
      ) : null}

      {isAdmin && (expiring.data ?? []).length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Abonnements qui expirent bientôt" icon="event_busy" />
          <Card className="divide-y divide-border overflow-hidden">
            {(expiring.data ?? []).slice(0, 6).map((m) => {
              const left = daysLeft(m.endDate, now)
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <Avatar firstName={m.user.firstName} lastName={m.user.lastName} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{m.user.firstName} {m.user.lastName}</div>
                    <div className="text-xs text-muted">{m.plan.name} · {m.user.phone ?? 'pas de téléphone'}</div>
                  </div>
                  <Badge tone={left <= 3 ? 'danger' : 'warning'}>{left <= 0 ? 'Expire aujourd’hui' : `${left} jour${left > 1 ? 's' : ''}`}</Badge>
                </div>
              )
            })}
          </Card>
        </section>
      ) : null}
    </div>
  )
}
