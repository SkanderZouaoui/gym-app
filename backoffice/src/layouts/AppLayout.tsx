import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { tokenStorage } from '../api/storage'
import { authApi } from '../api/endpoints'
import { useSessionStore } from '../store/session'
import { useAppConfigDraft } from '../store/useAppConfigDraft'
import { PublishDialog } from '../components/PublishDialog'

const NAV_GROUPS = [
  {
    group: 'Pilotage',
    items: [
      { to: '/', label: 'Vue d’ensemble', icon: 'space_dashboard', end: true },
      { to: '/stats', label: 'Statistiques', icon: 'monitoring' },
      { to: '/publish', label: 'Publication', icon: 'rocket_launch', badge: 'changes' },
    ],
  },
  {
    group: 'Gestion de la salle',
    items: [
      { to: '/members', label: 'Adhérents', icon: 'group' },
      { to: '/coaches', label: 'Coachs', icon: 'badge' },
      { to: '/team', label: 'Équipe', icon: 'shield_person' },
      { to: '/planning', label: 'Planning', icon: 'calendar_month' },
      { to: '/privates', label: 'Coaching privé', icon: 'sports' },
      { to: '/exercises', label: 'Exercices', icon: 'fitness_center' },
      { to: '/attendance', label: 'Présences', icon: 'qr_code_scanner' },
    ],
  },
  {
    group: 'Application',
    items: [
      { to: '/brand', label: 'Identité visuelle', icon: 'palette' },
      { to: '/home', label: 'Écran d’accueil', icon: 'home' },
      { to: '/nav', label: 'Navigation', icon: 'tab' },
      { to: '/texts', label: 'Textes & langues', icon: 'translate' },
      { to: '/notifications', label: 'Annonces & notifications', icon: 'campaign' },
    ],
  },
  {
    group: 'Offre',
    items: [
      { to: '/plans', label: 'Formules & tarifs', icon: 'sell' },
      { to: '/courses', label: 'Catalogue de cours', icon: 'event' },
    ],
  },
  {
    group: 'Règles & accès',
    items: [
      { to: '/rules', label: 'Réservation & accès', icon: 'rule' },
      { to: '/roles', label: 'Rôles & permissions', icon: 'admin_panel_settings' },
      { to: '/settings', label: 'Politique de présence', icon: 'settings' },
    ],
  },
]

export function AppLayout() {
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clear)
  const navigate = useNavigate()
  const { changeCount } = useAppConfigDraft()
  const [publishOpen, setPublishOpen] = useState(false)

  const handleLogout = async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {})
    tokenStorage.clear()
    clearSession()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-(--color-bg)">
      <aside className="sticky top-0 flex h-screen w-64 flex-none flex-col gap-1 self-start border-r border-(--color-border) bg-(--color-surface) py-3">
        <div className="mb-2 flex items-center gap-2.5 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-xs font-extrabold text-(--color-primary-contrast)">
            MU
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold">MuscleUP</div>
            <div className="text-xs text-(--color-muted)">Back-office</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-3 pb-3">
          {NAV_GROUPS.map((g) => (
            <div key={g.group} className="flex flex-col gap-0.5">
              <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--color-muted)">
                {g.group}
              </div>
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-semibold transition ${
                      isActive
                        ? 'bg-(--color-primary-soft) text-(--color-primary-ink)'
                        : 'text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-text)'
                    }`
                  }
                >
                  <span className="material-symbols-rounded text-[20px]">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge === 'changes' && changeCount > 0 ? (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-(--color-primary) px-1.5 text-[11px] font-bold text-(--color-primary-contrast)">
                      {changeCount}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-(--color-border) px-4 py-3">
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-(--color-accent-soft) text-xs font-bold text-(--color-accent-ink)">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13.5px] font-bold">
              {user?.firstName} {user?.lastName}
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Déconnexion"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-text)"
          >
            <span className="material-symbols-rounded text-[20px]">logout</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-none items-center gap-3 border-b border-(--color-border) bg-(--color-surface) px-6">
          <div className="flex-1" />
          {changeCount > 0 ? (
            <span className="flex h-7.5 items-center gap-1.5 rounded-full border border-(--color-warning-border) bg-(--color-warning-soft) px-3 text-xs font-bold text-(--color-warning-ink)">
              <span className="h-1.5 w-1.5 rounded-full bg-(--color-warning)" />
              Brouillon · {changeCount} modification(s)
            </span>
          ) : (
            <span className="flex h-7.5 items-center gap-1.5 rounded-full border border-(--color-success-border) bg-(--color-success-soft) px-3 text-xs font-bold text-(--color-success-ink)">
              <span className="material-symbols-rounded text-[16px]">check_circle</span>
              À jour
            </span>
          )}
          <button
            onClick={() => changeCount > 0 && setPublishOpen(true)}
            disabled={changeCount === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-(--color-primary) px-4 text-[13.5px] font-bold text-(--color-primary-contrast) hover:bg-(--color-primary-hover) disabled:cursor-not-allowed disabled:bg-(--color-surface-2) disabled:text-(--color-muted)"
          >
            <span className="material-symbols-rounded text-[18px]">rocket_launch</span>
            Publier
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {publishOpen ? <PublishDialog onClose={() => setPublishOpen(false)} /> : null}
    </div>
  )
}
