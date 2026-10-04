import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../api/endpoints'
import { useSessionStore } from '../store/session'

function startOfMonthIso() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function nowIso() {
  return new Date().toISOString()
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  TRANSFER: 'Virement',
  CHECK: 'Chèque',
  OTHER: 'Autre',
}

export function StatsPage() {
  const activeBranchId = useSessionStore((s) => s.activeBranchId)
  const [from] = useState(startOfMonthIso())
  const [to] = useState(nowIso())
  const [exporting, setExporting] = useState(false)

  const { data } = useQuery({
    queryKey: ['stats', 'overview', activeBranchId, from, to],
    queryFn: () => statsApi.getOverview(activeBranchId!, from, to),
    enabled: !!activeBranchId,
  })

  const handleExport = async () => {
    if (!activeBranchId) return
    setExporting(true)
    try {
      const blob = await statsApi.exportPaymentsCsv(activeBranchId, from, to)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'encaissements.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Statistiques</h1>
          <p className="text-sm text-(--color-muted)">Depuis le début du mois</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex h-10 items-center gap-2 rounded-lg border border-(--color-border-strong) px-4 text-sm font-bold hover:bg-(--color-surface-2) disabled:opacity-50"
        >
          {exporting ? 'Export…' : 'Exporter les encaissements (CSV)'}
        </button>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Taux de remplissage" value={`${data.attendance.fillRate}%`} />
            <StatCard label="Taux de no-show" value={`${data.attendance.noShowRate}%`} tone="warning" />
            <StatCard label="Nouveaux adhérents" value={data.newMembers.total} />
            <StatCard label="Rétention 30j" value={`${data.retention.retentionRate}%`} tone="success" />
          </div>

          <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
            <h2 className="font-head text-base font-bold">Présence et remplissage</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Cours" value={data.attendance.sessionsCount} />
              <Metric label="Capacité totale" value={data.attendance.totalCapacity} />
              <Metric label="Présences" value={data.attendance.attended} />
              <Metric label="No-show" value={data.attendance.noShow} />
            </div>
          </section>

          <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-head text-base font-bold">Revenus par mode</h2>
              <span className="font-head text-xl font-extrabold text-(--color-primary-ink)">
                {data.revenue.total} DT
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {data.revenue.byMethod.length > 0 ? (
                data.revenue.byMethod.map((m) => (
                  <div key={m.method} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-semibold">{METHOD_LABELS[m.method] ?? m.method}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-(--color-surface-2)">
                      <div
                        className="h-full rounded-full bg-(--color-primary)"
                        style={{ width: `${(m.amount / data.revenue.total) * 100}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-bold">{m.amount} DT</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-(--color-muted)">Aucun encaissement sur la période.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
            <h2 className="font-head text-base font-bold">Rétention / churn</h2>
            <p className="mt-1 text-sm text-(--color-muted)">
              Parmi les {data.retention.cohortSize} adhérent(s) actif(s) il y a 30 jours,{' '}
              {data.retention.retainedCount} le sont toujours.
            </p>
            <div className="mt-3 flex gap-4">
              <Metric label="Rétention" value={`${data.retention.retentionRate}%`} />
              <Metric label="Churn" value={`${data.retention.churnRate}%`} />
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-(--color-muted)">Chargement…</p>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'warning' }) {
  const toneClass =
    tone === 'success'
      ? 'text-(--color-success-ink)'
      : tone === 'warning'
        ? 'text-(--color-warning-ink)'
        : 'text-(--color-text)'
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
      <span className={`font-head text-2xl font-extrabold ${toneClass}`}>{value}</span>
      <span className="text-xs text-(--color-muted)">{label}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-head text-xl font-extrabold">{value}</span>
      <span className="text-xs text-(--color-muted)">{label}</span>
    </div>
  )
}
