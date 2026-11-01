import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type WebRole } from '../store/auth'
import { LogoMark } from './ui'

export function Splash() {
  return (
    <div className="grid min-h-svh place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <span className="grid size-14 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-pressed text-white shadow-primary">
          <LogoMark size={28} />
        </span>
        <span className="font-head text-lg font-extrabold">MuscleUP</span>
      </div>
    </div>
  )
}

/** Réserve les pages à une personne connectée dont le rôle actif est ADMIN ou STAFF. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

/** Page réservée à certains rôles (ex. administration) ; les autres sont renvoyés à l'accueil. */
export function RequireRole({ roles, children }: { roles: WebRole[]; children: ReactNode }) {
  const activeRole = useAuth((s) => s.activeRole)
  if (!activeRole || !roles.includes(activeRole)) return <Navigate to="/" replace />
  return <>{children}</>
}
