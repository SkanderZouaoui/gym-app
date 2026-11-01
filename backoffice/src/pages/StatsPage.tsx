import { useMemo, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { downloadPaymentsCsv, useScanLogs, useStatsOverview } from '../api/stats'
import { addDays, formatDate, formatDateTime, formatMoney, METHOD_ICON, METHOD_LABEL, startOfDay } from '../lib/format'
import { REASON_LABEL } from '../lib/reasons'
import { Badge, BarChart, Button, Card, EmptyState, Icon, PageHeader, Pagination, Ring, SectionHeader, Skeleton, SplitBar, Stat, Tabs, useToast } from '../components/ui'

type Period = '7' | '30' | 'month' | 'last' | 'custom'
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function Overview() {
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('30')
  const [from, setFrom] = useState(() => iso(addDays(new Date(), -30)))
  const [to, setTo] = useState(() => iso(new Date()))
  const [anchor] = useState(() => new Date())
  const [exporting, setExporting] = useState(false)

  const range = useMemo(() => {
    const day = startOfDay(anchor)
    const end = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    if (period === '7') return { from: addDays(day, -6), to: end(day) }
    if (period === '30') return { from: addDays(day, -29), to: end(day) }
    if (period === 'month') return { from: new Date(day.getFullYear(), day.getMonth(), 1), to: end(day) }
    if (period === 'last') return { from: new Date(day.getFullYear(), day.getMonth() - 1, 1), to: end(new Date(day.getFullYear(), day.getMonth(), 0)) }
    const [fy, fm, fd] = from.split('-').map(Number)
    const [ty, tm, td] = to.split('-').map(Number)
    return { from: new Date(fy, fm - 1, fd), to: new Date(ty, tm - 1, td, 23, 59, 59, 999) }
  }, [period, from, to, anchor])
  const fromIso = range.from.toISOString()
  const toIso = range.to.toISOString()
  const { data, isLoading } = useStatsOverview(fromIso, toIso)

  const newMembersByDay = useMemo(() => (data?.newMembers.byDay ?? []).map((d) => ({ label: formatDate(d.date, { day: 'numeric', month: 'short' }), value: d.count })), [data])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={period} onChange={setPeriod} options={[{ value: '7', label: '7 jours' }, { value: '30', label: '30 jours' }, { value: 'month', label: 'Ce mois' }, { value: 'last', label: 'Mois dernier' }, { value: 'custom', label: 'Personnalisé' }]} />
        {period === 'custom' ? (
          <div className="flex items-center gap-2">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary" />
            <Icon name="arrow_forward" size={18} className="text-muted" />
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary" />
          </div>
        ) : (
          <span className="text-sm text-muted">{formatDate(range.from)} → {formatDate(range.to)}</span>
        )}
        <Button
          className="ml-auto"
          variant="outline"
          icon="download"
          loading={exporting}
          onClick={async () => {
            setExporting(true)
            try {
              await downloadPaymentsCsv(fromIso, toIso)
            } catch (e) {
              toast(apiErrorMessage(e, "L'export a échoué."), 'danger')
            } finally {
              setExporting(false)
            }
          }}
        >
          Exporter les encaissements (CSV)
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon="payments" label="Chiffre d’affaires" value={formatMoney(data.revenue.total)} hint={`${data.revenue.byMethod.reduce((n, m) => n + m.count, 0)} encaissements`} tone="success" />
            <Stat icon="person_add" label="Nouveaux adhérents" value={data.newMembers.total} tone="primary" />
            <Stat icon="event_seat" label="Taux de remplissage" value={`${data.attendance.fillRate} %`} hint={`${data.attendance.sessionsCount} cours`} tone="info" />
            <Stat icon="loyalty" label="Rétention" value={`${data.retention.retentionRate} %`} hint={`${data.retention.retainedCount} / ${data.retention.cohortSize} adhérents`} tone="warning" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="space-y-3">
              <SectionHeader title="Fréquentation des cours" icon="event_available" />
              <Card className="space-y-6 p-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Ring percent={data.attendance.fillRate} label="Remplissage" sub={`${data.attendance.totalBooked} inscrits pour ${data.attendance.totalCapacity} places`} />
                  <Ring percent={100 - data.attendance.noShowRate} label="Présence effective" sub={`${data.attendance.noShowRate} % d’absences`} tone={data.attendance.noShowRate > 40 ? 'danger' : data.attendance.noShowRate > 20 ? 'warning' : 'success'} />
                </div>
                <SplitBar parts={[{ label: 'Présents', value: data.attendance.attended, className: 'bg-success' }, { label: 'Absences', value: data.attendance.noShow, className: 'bg-danger' }, { label: 'À venir ou annulés', value: Math.max(0, data.attendance.totalBooked - data.attendance.attended - data.attendance.noShow), className: 'bg-border-strong' }]} />
              </Card>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Encaissements par moyen" icon="account_balance_wallet" />
              <Card className="space-y-4 p-6">
                {data.revenue.byMethod.length === 0 ? (
                  <EmptyState icon="payments" title="Aucun encaissement" hint="Aucun paiement sur cette période." />
                ) : (
                  data.revenue.byMethod.map((m) => (
                    <div key={m.method} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm"><Icon name={METHOD_ICON[m.method]} size={18} className="text-primary-ink" /><b className="flex-1">{METHOD_LABEL[m.method]}</b><span className="text-muted">{m.count} paiement{m.count > 1 ? 's' : ''}</span><b className="w-28 text-right font-head">{formatMoney(m.amount)}</b></div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gradient-to-r from-primary to-[#8B5CF6]" style={{ width: `${(m.amount / Math.max(1, data.revenue.total)) * 100}%` }} /></div>
                    </div>
                  ))
                )}
              </Card>
            </section>
          </div>

          <section className="space-y-3">
            <SectionHeader title="Nouveaux adhérents" icon="person_add" />
            <Card className="p-6">
              {newMembersByDay.length === 0 ? <EmptyState icon="person_add" title="Aucune inscription" hint="Aucun nouvel adhérent sur cette période." /> : <BarChart data={newMembersByDay} />}
            </Card>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Rétention" icon="loyalty" />
            <Card className="grid gap-6 p-6 sm:grid-cols-3">
              <Ring percent={data.retention.retentionRate} label="Adhérents conservés" sub={`${data.retention.retainedCount} sur ${data.retention.cohortSize}`} tone="success" />
              <Ring percent={data.retention.churnRate} label="Départs" sub="Abonnements non renouvelés" tone="danger" />
              <p className="self-center text-sm text-muted">Part des adhérents dont l’abonnement arrivait à échéance et qui sont restés abonnés.</p>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

const PAGE = 15
function Journal() {
  const { data, isLoading } = useScanLogs()
  const [page, setPage] = useState(0)
  const logs = data ?? []
  const pageCount = Math.max(1, Math.ceil(logs.length / PAGE))
  const current = Math.min(page, pageCount - 1)
  const shown = logs.slice(current * PAGE, (current + 1) * PAGE)
  return (
    <Card className="overflow-hidden">
      {isLoading ? (
        <div className="p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="my-2 h-12" />)}</div>
      ) : logs.length === 0 ? (
        <EmptyState icon="qr_code_scanner" title="Aucun pointage enregistré" hint="Les scans et pointages manuels apparaissent ici." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-left text-[11.5px] font-bold uppercase tracking-wider text-muted">
              <th className="px-5 py-3">Date</th>
              <th className="px-4 py-3">Adhérent</th>
              <th className="hidden px-4 py-3 md:table-cell">Cours</th>
              <th className="px-4 py-3">Résultat</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(l.scannedAt)}</td>
                <td className="px-4 py-3 font-bold">{l.user ? `${l.user.firstName} ${l.user.lastName}` : '—'}</td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">{l.session ? `${l.session.classType.name} · ${formatDateTime(l.session.startsAt)}` : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={l.result === 'GRANTED' ? 'success' : 'danger'} dot>{l.result === 'GRANTED' ? 'Accepté' : 'Refusé'}</Badge>
                    {l.result === 'DENIED' ? <span className="text-xs text-muted">{REASON_LABEL[l.reasonCode] ?? l.reasonCode}</span> : null}
                    {l.offline ? <Badge tone="info">Hors ligne</Badge> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination page={current} pageCount={pageCount} onChange={setPage} total={logs.length} pageSize={PAGE} />
    </Card>
  )
}

/** Statistiques détaillées de la salle (période au choix) et journal des pointages. */
export function StatsPage() {
  const [tab, setTab] = useState<'overview' | 'journal'>('overview')
  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" subtitle="Activité, chiffre d’affaires, fréquentation et rétention." />
      <Tabs value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Vue d’ensemble' }, { value: 'journal', label: 'Journal de pointage' }]} />
      {tab === 'overview' ? <Overview /> : <Journal />}
    </div>
  )
}
