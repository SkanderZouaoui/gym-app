import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/endpoints'
import { useSessionStore } from '../store/session'

export function DashboardPage() {
  const activeBranchId = useSessionStore((s) => s.activeBranchId)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard', activeBranchId],
    queryFn: () => adminApi.getDashboard(activeBranchId ?? undefined),
    enabled: !!activeBranchId,
  })

  const kpis = [
    { label: 'Adhérents actifs', value: data?.activeMembers ?? 0, icon: 'group' },
    { label: 'Présences du jour', value: data?.attendanceToday ?? 0, icon: 'event_available' },
    { label: 'Cours aujourd\'hui', value: data?.classesToday ?? 0, icon: 'calendar_month' },
    { label: 'Remplissage moyen', value: `${data?.avgFillRate ?? 0}%`, icon: 'bar_chart' },
    { label: 'Revenus du jour', value: `${data?.revenueToday ?? 0} DT`, icon: 'payments' },
    { label: 'Revenus du mois', value: `${data?.revenueMonth ?? 0} DT`, icon: 'account_balance_wallet' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Tableau de bord</h1>
        <p className="text-sm text-(--color-muted)">Vue d'ensemble du site</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-(--color-muted)">Chargement…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {kpis.map((k) => (
              <div key={k.label} className="flex flex-col gap-2 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
                <span className="material-symbols-rounded flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary-soft) text-[18px] text-(--color-primary-ink)">
                  {k.icon}
                </span>
                <span className="font-head text-2xl font-extrabold">{k.value}</span>
                <span className="text-xs text-(--color-muted)">{k.label}</span>
              </div>
            ))}
          </div>

          {data?.alerts ? (
            <div className="rounded-2xl border border-(--color-warning) bg-(--color-warning-soft) p-4">
              <h3 className="font-head text-sm font-bold text-(--color-warning-ink)">Alertes</h3>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-(--color-warning-ink)">
                {data.alerts.expiringMemberships > 0 ? (
                  <li>{data.alerts.expiringMemberships} abonnement(s) expirent dans les 7 jours</li>
                ) : null}
                {data.alerts.underfilledClasses > 0 ? (
                  <li>{data.alerts.underfilledClasses} cours sous-remplis dans les 3 prochains jours</li>
                ) : null}
                {data.alerts.expiringMemberships === 0 && data.alerts.underfilledClasses === 0 ? (
                  <li>Aucune alerte</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
