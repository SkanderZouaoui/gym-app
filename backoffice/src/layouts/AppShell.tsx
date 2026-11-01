import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { navFor } from '../nav'
import { ROLE_LABEL } from '../lib/roles'
import { useMyNotifications } from '../api/me'
import { Avatar, Icon, LogoMark, cn } from '../components/ui'
import { useToast } from '../components/ui'


function UserMenu() {
  const { user, roles, activeRole, switchRole, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!user || !activeRole) return null
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/10">
        <Avatar firstName={user.firstName} lastName={user.lastName} photoUrl={user.photoUrl} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white">{user.firstName} {user.lastName}</span>
          <span className="block truncate text-xs text-white/60">{ROLE_LABEL[activeRole]}</span>
        </span>
        <Icon name="unfold_more" size={18} className="text-white/50" />
      </button>
      {open ? (
        <div className="pop-in absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-pop">
          {roles.length > 1 ? (
            <div className="border-b border-border pb-1.5">
              <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">Utiliser en tant que</div>
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={async () => {
                    await switchRole(r)
                    setOpen(false)
                    navigate('/')
                    toast(`Mode ${ROLE_LABEL[r].toLowerCase()} activé`)
                  }}
                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-surface-2', r === activeRole && 'text-primary-ink')}
                >
                  <Icon name={r === 'ADMIN' ? 'admin_panel_settings' : 'badge'} size={18} />
                  <span className="flex-1 text-left">{ROLE_LABEL[r]}</span>
                  {r === activeRole ? <Icon name="check" size={18} /> : null}
                </button>
              ))}
            </div>
          ) : null}
          <button onClick={() => { setOpen(false); navigate('/profile') }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-surface-2">
            <Icon name="person" size={18} /> Mon profil
          </button>
          <button
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-danger-ink hover:bg-danger-soft"
          >
            <Icon name="logout" size={18} /> Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const activeRole = useAuth((s) => s.activeRole)
  const unread = (useMyNotifications().data ?? []).filter((n) => !n.readAt).length
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#3b1764] to-[#2a0f4a] px-4 py-5 text-white">
      <div className="mb-6 flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[#5b21b6] shadow-primary">
          <LogoMark size={22} />
        </span>
        <div>
          <div className="font-head text-lg font-extrabold leading-none">MuscleUP</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/50">Back-office</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {navFor(activeRole).map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.title ? <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-white/40">{group.title}</div> : null}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-2xl px-3 text-[14.5px] font-semibold transition',
                    isActive ? 'bg-white text-primary-ink shadow-card' : 'text-white/75 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} size={22} filled={isActive} />
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/notifications' && unread > 0 ? <span className={cn('grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-[11px] font-bold', isActive ? 'bg-primary text-white' : 'bg-white text-primary-ink')}>{unread}</span> : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <UserMenu />
      </div>
    </div>
  )
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fade-in absolute inset-0 bg-secondary/50" onClick={() => setOpen(false)} />
          <aside className="slide-in absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="grid size-10 place-items-center rounded-full hover:bg-surface-2">
            <Icon name="menu" size={24} />
          </button>
          <span className="font-head text-base font-extrabold">MuscleUP</span>
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
