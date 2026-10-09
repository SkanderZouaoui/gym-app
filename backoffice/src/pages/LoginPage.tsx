import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, meApi } from '../api/endpoints'
import { tokenStorage } from '../api/storage'
import { useSessionStore } from '../store/session'
import { getApiErrorMessage } from '../api/client'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const setSession = useSessionStore((s) => s.setSession)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const tokens = await authApi.login(email, password)
      tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await meApi.getMe()
      const isAdmin = user.roles.some((r) => r.role === 'ADMIN')
      if (!isAdmin) {
        tokenStorage.clear()
        setError("Ce compte n'a pas accès au back-office")
        return
      }
      setSession(user)
      navigate('/')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Email ou mot de passe incorrect'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-bg) p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-(--color-border) bg-(--color-surface) p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--color-primary) font-bold text-white">
            MU
          </div>
          <h1 className="text-2xl font-bold text-(--color-secondary)">MuscleUP</h1>
          <p className="text-sm text-(--color-muted)">Back-office administrateur</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-(--color-text)">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-(--color-text)">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-lg border border-(--color-border) px-3 text-sm outline-none focus:border-(--color-primary)"
            />
          </div>
          {error ? <p className="text-sm font-medium text-(--color-danger)">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-lg bg-(--color-primary) text-sm font-bold text-white transition hover:bg-(--color-primary-hover) disabled:opacity-50"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </div>
      </form>
    </div>
  )
}
