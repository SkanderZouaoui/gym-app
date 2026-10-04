import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { branchesApi } from '../api/endpoints'
import { tokenStorage } from '../api/storage'
import { authApi } from '../api/endpoints'
import { hasNetworkScope, useSessionStore } from '../store/session'

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', icon: 'dashboard', end: true },
  { to: '/members', label: 'Adhérents', icon: 'group' },
  { to: '/plans', label: 'Abonnements', icon: 'card_membership' },
  { to: '/planning', label: 'Planning', icon: 'calendar_month' },
  { to: '/attendance', label: 'Présences', icon: 'qr_code_scanner' },
  { to: '/settings', label: 'Paramètres', icon: 'settings' },
]

export function AppLayout() {
  const user = useSessionStore((s) => s.user)
  const activeBranchId = useSessionStore((s) => s.activeBranchId)
  const setActiveBranchId = useSessionStore((s) => s.setActiveBranchId)
  const clearSession = useSessionStore((s) => s.clear)
  const navigate = useNavigate()
  const [siteMenuOpen, setSiteMenuOpen] = useState(false)

  const isNetworkAdmin = hasNetworkScope(user)
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.findAll,
    enabled: isNetworkAdmin,
  })

  useEffect(() => {
    if (isNetworkAdmin && !activeBranchId && branches && branches.length > 0) {
      setActiveBranchId(branches[0].id)
    }
  }, [isNetworkAdmin, activeBranchId, branches, setActiveBranchId])

  const handleLogout = async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {})
    tokenStorage.clear()
    clearSession()
    navigate('/login')
  }

  const activeBranchName = branches?.find((b) => b.id === activeBranchId)?.name ?? 'Tous les sites'

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
          {isNetworkAdmin ? (
            <div className="relative">
              <button
                onClick={() => setSiteMenuOpen((o) => !o)}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-(--color-border) px-3 text-sm font-semibold"
              >
                <span className="material-symbols-rounded text-[18px] text-(--color-primary)">location_on</span>
                {activeBranchName}
                <span className="material-symbols-rounded text-[18px]">expand_more</span>
              </button>
              {siteMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-56 rounded-lg border border-(--color-border) bg-(--color-surface) p-1.5 shadow-lg">
                  <button
                    onClick={() => {
                      setActiveBranchId(null)
                      setSiteMenuOpen(false)
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-(--color-surface-2)"
                  >
                    Tous les sites
                  </button>
                  {branches?.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveBranchId(b.id)
                        setSiteMenuOpen(false)
                      }}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-(--color-surface-2)"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
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
