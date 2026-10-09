import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { tokenStorage } from '../api/storage'
import { authApi } from '../api/endpoints'
import { useSessionStore } from '../store/session'

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', icon: 'dashboard', end: true },
  { to: '/members', label: 'Adhérents', icon: 'group' },
  { to: '/plans', label: 'Abonnements', icon: 'card_membership' },
  { to: '/planning', label: 'Planning', icon: 'calendar_month' },
  { to: '/attendance', label: 'Présences', icon: 'qr_code_scanner' },
  { to: '/stats', label: 'Statistiques', icon: 'monitoring' },
  { to: '/settings', label: 'Paramètres', icon: 'settings' },
]

export function AppLayout() {
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clear)
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {})
    tokenStorage.clear()
    clearSession()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-(--color-bg)">
      <aside className="flex w-60 flex-none flex-col gap-1 bg-(--color-secondary) p-3 text-white">
        <div className="mb-4 flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-xs font-extrabold">
            MU
          </div>
          <span className="text-lg font-extrabold">MuscleUP</span>
        </div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span className="material-symbols-rounded text-[20px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="flex-1" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
        >
          <span className="material-symbols-rounded text-[20px]">logout</span>
          Déconnexion
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-none items-center gap-4 border-b border-(--color-border) bg-(--color-surface) px-6">
          <div className="flex-1" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
