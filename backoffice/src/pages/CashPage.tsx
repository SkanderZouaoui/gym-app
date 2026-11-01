import { useMemo, useState } from 'react'
import { usePayments } from '../api/hooks'
import { useAuth } from '../store/auth'
import { formatDate, formatMoney, formatTime, METHOD_ICON, METHOD_LABEL, type PaymentMethod } from '../lib/format'
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, PageHeader, Pagination, Skeleton, Stat, Tabs } from '../components/ui'
import { SellModal } from '../components/domain/SellModal'

type Period = 'month' | 'last' | 'custom'
const PAGE_SIZE = 12
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function CashPage() {
  const isAdmin = useAuth((s) => s.activeRole === 'ADMIN')
  const [period, setPeriod] = useState<Period>('month')
  const [from, setFrom] = useState(() => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [to, setTo] = useState(() => iso(new Date()))
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all')
  const [page, setPage] = useState(0)
  const [selling, setSelling] = useState(false)

  // Période envoyée au serveur (début de journée → fin de journée, heure locale), comme la caisse mobile.
  const [anchor] = useState(() => new Date())
  const range = useMemo(() => {
    const n = anchor
    if (period === 'month') return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString(), to: new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999).toISOString() }
    if (period === 'last') return { from: new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString(), to: new Date(n.getFullYear(), n.getMonth(), 0, 23, 59, 59, 999).toISOString() }
    const [fy, fm, fd] = from.split('-').map(Number)
    const [ty, tm, td] = to.split('-').map(Number)
    return { from: new Date(fy, fm - 1, fd, 0, 0, 0, 0).toISOString(), to: new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString() }
  }, [anchor, period, from, to])

  const { data, isLoading, isError, refetch } = usePayments(range)
  const payments = data ?? []
  const total = payments.reduce((n, p) => n + Number(p.amount), 0)
  const byMethod = (['CASH', 'OTHER', 'TRANSFER', 'CHECK'] as PaymentMethod[])
    .map((m) => ({ m, total: payments.filter((p) => p.method === m).reduce((n, p) => n + Number(p.amount), 0), count: payments.filter((p) => p.method === m).length }))
    .filter((x) => x.count > 0)
  const filtered = payments.filter((p) => method === 'all' || p.method === method)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const shown = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  const choose = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Encaissements' : 'Ma caisse'}
        subtitle={isAdmin ? 'Historique de la caisse de la salle.' : 'Les encaissements que vous avez enregistrés.'}
        actions={<Button icon="add_card" onClick={() => setSelling(true)}>Nouvelle vente</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={period} onChange={choose(setPeriod)} options={[{ value: 'month', label: 'Ce mois' }, { value: 'last', label: 'Mois dernier' }, { value: 'custom', label: 'Personnalisé' }]} />
        {period === 'custom' ? (
          <div className="flex items-center gap-2">
            <input type="date" value={from} max={to} onChange={(e) => choose(setFrom)(e.target.value)} className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary" />
            <Icon name="arrow_forward" size={18} className="text-muted" />
            <input type="date" value={to} min={from} onChange={(e) => choose(setTo)(e.target.value)} className="h-11 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary" />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-[#5b21b6] p-5 text-white shadow-primary sm:col-span-2 xl:col-span-1">
          <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10" />
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">{period === 'custom' ? `${formatDate(range.from)} → ${formatDate(range.to)}` : period === 'month' ? 'Encaissé ce mois' : 'Encaissé le mois dernier'}</div>
          <div className="mt-1.5 font-head text-[34px] font-extrabold leading-none">{isLoading ? '…' : formatMoney(total)}</div>
          <div className="mt-2 text-sm text-white/80">{payments.length} encaissement{payments.length > 1 ? 's' : ''}</div>
        </div>
        {byMethod.slice(0, 3).map(({ m, total: t, count }) => (
          <Stat key={m} icon={METHOD_ICON[m]} label={METHOD_LABEL[m]} value={formatMoney(t)} hint={`${count} paiement${count > 1 ? 's' : ''}`} tone={m === 'CASH' ? 'success' : m === 'OTHER' ? 'info' : 'warning'} />
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="mr-auto text-lg">Encaissements</h2>
          <Tabs value={method} onChange={choose(setMethod)} options={[{ value: 'all', label: 'Tous' }, ...byMethod.map(({ m, count }) => ({ value: m, label: METHOD_LABEL[m], count }))]} />
        </div>
        {isLoading ? (
          <div className="p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="my-2 h-12" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState icon="payments" title="Aucun encaissement" hint="Aucun paiement enregistré sur cette période." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-[11.5px] font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Adhérent</th>
                <th className="hidden px-4 py-3 md:table-cell">Formule</th>
                <th className="px-4 py-3">Moyen</th>
                <th className="hidden px-4 py-3 sm:table-cell">Date</th>
                <th className="px-5 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar firstName={p.membership.user.firstName} lastName={p.membership.user.lastName} photoUrl={p.membership.user.photoUrl} size={36} />
                      <span className="truncate font-bold">{p.membership.user.firstName} {p.membership.user.lastName}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{p.membership.plan.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-muted"><Icon name={METHOD_ICON[p.method]} size={18} />{METHOD_LABEL[p.method]}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{formatDate(p.recordedAt)} · {formatTime(p.recordedAt)}</td>
                  <td className="px-5 py-3 text-right font-head font-extrabold">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={current} pageCount={pageCount} onChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
      </Card>

      {selling ? <SellModal onClose={() => setSelling(false)} /> : null}
    </div>
  )
}
