import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from './storage'

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<void> | null = null

async function refreshTokens(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN')
  const res = await axios.post(`${BASE_URL}/v1/auth/refresh`, { refreshToken })
  tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken)
}

type Retryable = InternalAxiosRequestConfig & { _retry?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as Retryable | undefined
    const isAuthCall = original?.url?.includes('/v1/auth/')
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        // Un seul rafraîchissement même si plusieurs requêtes échouent en même temps.
        refreshPromise ??= refreshTokens().finally(() => {
          refreshPromise = null
        })
        await refreshPromise
        return api(original)
      } catch {
        tokenStorage.clear()
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

/** Codes d'erreur de l'API → messages lisibles (le reste retombe sur `fallback`). */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  ROLE_NOT_AUTHORIZED: "Ce compte n’a pas accès à cet espace.",
  EMAIL_TAKEN: 'Cette adresse e-mail est déjà utilisée.',
  PHONE_TAKEN: 'Ce numéro de téléphone est déjà utilisé.',
  SESSION_NOT_EDITABLE: 'Un cours passé ou en cours ne peut plus être modifié.',
  NOT_YOUR_SESSION: "Ce cours n'est pas le vôtre.",
  GALLERY_FULL: 'La galerie est pleine (12 photos).',
  INVALID_IMAGE: "Ce fichier n'est pas une image valide.",
  FILE_TOO_LARGE: 'Fichier trop volumineux (10 Mo maximum).',
  LOCATION_NOT_FOUND: 'Aucune position trouvée dans ce lien.',
  ROOM_IN_USE: 'Cette salle est utilisée par des cours.',
  USER_NOT_FOUND: 'Utilisateur introuvable.',
  SESSION_FULL: 'Le cours est complet.',
}

export function apiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) return (error.response?.data as { code?: string; message?: string } | undefined)?.code ?? null
  return null
}

export function apiErrorMessage(error: unknown, fallback = "Une erreur est survenue. Réessayez."): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Serveur injoignable. Vérifiez votre connexion.'
    if (error.response.status === 429) return 'Trop de tentatives. Patientez un instant avant de réessayer.'
    const body = error.response.data as { code?: string; message?: string | string[] } | undefined
    if (body?.code && MESSAGES[body.code]) return MESSAGES[body.code]
    if (typeof body?.message === 'string' && body.message && !/^[A-Z_]+$/.test(body.message)) return body.message
  }
  return fallback
}
