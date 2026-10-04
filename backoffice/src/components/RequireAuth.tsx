import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { meApi } from '../api/endpoints'
import { tokenStorage } from '../api/storage'
import { useSessionStore } from '../store/session'

export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const setSession = useSessionStore((s) => s.setSession)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      setChecked(true)
      return
    }
    const token = tokenStorage.getAccessToken()
    if (!token) {
      setChecked(true)
      return
    }
    meApi
      .getMe()
      .then((user) => setSession(user))
      .catch(() => tokenStorage.clear())
      .finally(() => setChecked(true))
  }, [isAuthenticated, setSession])

  if (!checked) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
