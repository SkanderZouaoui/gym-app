import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type WebRole } from '../store/auth'
import logoMark from '../assets/logo-mark.png'
import logoWord from '../assets/logo-word.png'

export function Splash() {
  return (
    <div className="grid min-h-svh place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <span className="flex animate-pulse flex-col items-center gap-2 rounded-3xl bg-[#1b1432] px-8 py-6">
          <img src={logoMark} alt="MuscleUP" className="h-12 w-auto" />
          <img src={logoWord} alt="" className="h-3 w-auto" />
        </span>
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
