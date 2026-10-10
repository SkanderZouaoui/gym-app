import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi, appConfigApi, plansApi } from '../api/endpoints'
import { contrastRatio } from '@muscleup/shared'
import { useAppConfigDraft } from '../store/useAppConfigDraft'

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
  })
  const { draft } = useAppConfigDraft()
  const { data: history } = useQuery({ queryKey: ['app-config', 'history'], queryFn: appConfigApi.history })
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: plansApi.findAll })

  const kpis = [
    { label: 'Adhérents actifs', value: data?.activeMembers ?? 0, icon: 'group' },
    { label: 'Présences du jour', value: data?.attendanceToday ?? 0, icon: 'event_available' },
    { label: "Cours aujourd'hui", value: data?.classesToday ?? 0, icon: 'calendar_month' },
    { label: 'Remplissage moyen', value: `${data?.avgFillRate ?? 0}%`, icon: 'bar_chart' },
    { label: 'Revenus du jour', value: `${data?.revenueToday ?? 0} DT`, icon: 'payments' },
    { label: 'Revenus du mois', value: `${data?.revenueMonth ?? 0} DT`, icon: 'account_balance_wallet' },
  ]

  const live = history?.[0]
  const branding = draft?.branding
  const ratio = branding ? contrastRatio(branding.primaryContrast, branding.primary) : 0
  const contrastOk = ratio >= 4.5
  const modulesOn = draft?.homeModules.filter((m) => m.on).length ?? 0
  const tabsOn = draft?.tabs.filter((t) => t.on).length ?? 0
  const tabsOk = tabsOn >= 3 && tabsOn <= 5
  const arTotal = draft?.strings.length ?? 0
  const arDone = draft?.strings.filter((s) => s.ar.trim()).length ?? 0
  const plansOn = (plans ?? []).length

  const checklist = [
    {
      icon: 'palette',
      label: 'Identité visuelle',
      detail: `Contraste du bouton primaire ${ratio.toFixed(2)}:1`,
      ok: contrastOk,
      status: contrastOk ? 'Conforme AA' : 'À corriger',
      to: '/brand',
    },
    {
      icon: 'home',
      label: 'Écran d’accueil',
      detail: `${modulesOn} blocs affichés`,
      ok: modulesOn >= 2,
      status: modulesOn >= 2 ? 'OK' : 'Trop vide',
      to: '/home',
    },
    {
      icon: 'tab',
      label: 'Navigation',
      detail: `${tabsOn} onglets actifs`,
      ok: tabsOk,
      status: tabsOk ? 'OK' : 'Invalide',
      to: '/nav',
    },
    {
      icon: 'translate',
      label: 'Traduction arabe',
      detail: `${arDone} / ${arTotal} textes traduits`,
      ok: arDone === arTotal,
      status: arDone === arTotal ? 'Complète' : `${arTotal - arDone} manquant(s)`,
      to: '/texts',
    },
    {
      icon: 'sell',
      label: 'Formules visibles',
      detail: `${plansOn} formule(s) proposée(s) dans l'app`,
      ok: plansOn > 0,
      status: plansOn > 0 ? 'OK' : 'Aucune',
      to: '/plans',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Vue d’ensemble</h1>
        <p className="text-sm text-(--color-muted)">État de l'application client et contrôles avant publication.</p>
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

      {live ? (
        <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-(--color-secondary) p-6 text-white">
          <div className="min-w-50 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide opacity-75">Version en ligne</div>
            <div className="font-head text-[28px] font-extrabold tracking-tight">v{live.versionNumber}</div>
            <div className="text-[13.5px] opacity-85">
              Publiée {new Date(live.publishedAt ?? live.createdAt).toLocaleDateString('fr-FR')}
              {live.publishedBy ? ` par ${live.publishedBy.firstName} ${live.publishedBy.lastName}` : ''} · iOS, Android et Web
            </div>
          </div>
          <Link
            to="/publish"
            className="flex h-10 items-center rounded-lg border border-white/35 px-3.5 text-[13.5px] font-bold hover:bg-white/10"
          >
            Historique
          </Link>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="border-b border-(--color-border) px-5 py-4">
          <div className="font-head text-[15px] font-bold">État de la configuration</div>
          <div className="text-[13px] text-(--color-muted)">Contrôles automatiques avant publication</div>
        </div>
        {checklist.map((c) => (
          <div key={c.label} className="flex items-center gap-3.5 border-b border-(--color-border) px-5 py-3 last:border-0">
            <span
              className="grid h-8.5 w-8.5 flex-none place-items-center rounded-lg"
              style={{
                background: c.ok ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                color: c.ok ? 'var(--color-success-ink)' : 'var(--color-danger-ink)',
              }}
            >
              <span className="material-symbols-rounded text-[20px]">{c.icon}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{c.label}</div>
              <div className="text-[12.5px] text-(--color-muted)">{c.detail}</div>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold"
              style={{
                background: c.ok ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                color: c.ok ? 'var(--color-success-ink)' : 'var(--color-danger-ink)',
              }}
            >
              {c.status}
            </span>
            <Link to={c.to} className="h-8 rounded-md border border-(--color-border-strong) px-3 text-xs font-bold leading-8 hover:bg-(--color-surface-2)">
              Ouvrir
            </Link>
          </div>
        ))}
      </section>
    </div>
  )
}
