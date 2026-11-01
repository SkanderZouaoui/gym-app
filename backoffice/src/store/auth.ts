import { create } from 'zustand'
import { api } from '../api/client'
import { tokenStorage } from '../api/storage'

/** Rôles autorisés dans le back-office : l'équipe de la salle uniquement. */
export type WebRole = 'ADMIN' | 'STAFF'
export const WEB_ROLES: WebRole[] = ['ADMIN', 'STAFF']

export interface Me {
  id: string
  email: string | null
  firstName: string
  lastName: string
  photoUrl?: string | null
  roles: { role: string }[]
}

interface AuthState {
  user: Me | null
  roles: WebRole[]
  activeRole: WebRole | null
  /** Session en cours de vérification au démarrage. */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  restore: () => Promise<void>
  switchRole: (role: WebRole) => Promise<void>
  logout: () => Promise<void>
}

export class NotTeamError extends Error {
  constructor() {
    super('NOT_TEAM')
  }
}

const isWebRole = (r: string): r is WebRole => (WEB_ROLES as string[]).includes(r)

/** Décode la charge utile (sans vérification : le serveur reste juge) pour connaître le rôle actif du jeton. */
function activeRoleOf(token: string | null): string | null {
  try {
    const payload = JSON.parse(atob((token ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.activeRole === 'string' ? payload.activeRole : null
  } catch {
    return null
  }
}

async function loadMe(): Promise<{ user: Me; roles: WebRole[]; active: WebRole }> {
  const { data: user } = await api.get<Me>('/v1/me')
  const roles = user.roles.map((r) => r.role).filter(isWebRole)
  if (roles.length === 0) throw new NotTeamError()
  const current = activeRoleOf(tokenStorage.getAccessToken())
  let active: WebRole | null = current && isWebRole(current) ? current : null
  if (!active) {
    // Le rôle par défaut du jeton peut être « adhérent » : on bascule sur le rôle d'équipe le plus élevé.
    const wanted: WebRole = roles.includes('ADMIN') ? 'ADMIN' : 'STAFF'
    const { data } = await api.post('/v1/auth/select-role', { role: wanted })
    tokenStorage.setTokens(data.accessToken, data.refreshToken)
    active = wanted
  }
  return { user, roles, active }
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  roles: [],
  activeRole: null,
  loading: true,

  async login(email, password) {
    const { data } = await api.post('/v1/auth/login', { email, password })
    tokenStorage.setTokens(data.accessToken, data.refreshToken)
    try {
      const { user, roles, active } = await loadMe()
      set({ user, roles, activeRole: active, loading: false })
    } catch (err) {
      // Compte sans rôle d'équipe : on révoque la session ouverte à l'instant.
      await api.post('/v1/auth/logout', { refreshToken: data.refreshToken }).catch(() => undefined)
      tokenStorage.clear()
      throw err
    }
  },

  async restore() {
    if (!tokenStorage.getAccessToken()) {
      set({ loading: false })
      return
    }
    try {
      const { user, roles, active } = await loadMe()
      set({ user, roles, activeRole: active, loading: false })
    } catch {
      tokenStorage.clear()
      set({ user: null, roles: [], activeRole: null, loading: false })
    }
  },

  async switchRole(role) {
    if (!get().roles.includes(role) || get().activeRole === role) return
    const { data } = await api.post('/v1/auth/select-role', { role })
    tokenStorage.setTokens(data.accessToken, data.refreshToken)
    set({ activeRole: role })
  },

  async logout() {
    const refreshToken = tokenStorage.getRefreshToken()
    if (refreshToken) await api.post('/v1/auth/logout', { refreshToken }).catch(() => undefined)
    tokenStorage.clear()
    set({ user: null, roles: [], activeRole: null })
  },
}))

export const isAdmin = () => useAuth.getState().activeRole === 'ADMIN'
