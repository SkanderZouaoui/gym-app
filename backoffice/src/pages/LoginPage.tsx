import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api, apiErrorCode, apiErrorMessage } from '../api/client'
import { NotTeamError, useAuth } from '../store/auth'
import { Button, Field, Icon, LogoMark } from '../components/ui'

/** Habillage de gauche : même identité que l'écran de connexion mobile (dégradé violet, rayures, barre d'haltères). */
function BrandPanel() {
  return (
    <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-[#8B5CF6] via-[#6D28D9] to-[#2E1065] text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <pattern id="stripes" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <line x1="0" y1="0" x2="0" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#stripes)" />
        <circle cx="86%" cy="18%" r="260" fill="rgba(255,255,255,0.05)" />
        <circle cx="10%" cy="92%" r="200" fill="rgba(255,255,255,0.05)" />
      </svg>

      <div className="relative flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
          <LogoMark size={24} />
        </span>
        <span className="font-head text-lg font-bold">MuscleUP</span>
        <span className="ml-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wider">BACK-OFFICE</span>
      </div>

      <div className="relative">
        <svg viewBox="0 0 520 80" className="mb-7 w-full max-w-md" aria-hidden>
          <rect x="0" y="34" width="520" height="12" rx="4" fill="#fff" />
          <rect x="0" y="14" width="20" height="52" rx="6" fill="#fff" />
          <rect x="28" y="22" width="14" height="36" rx="5" fill="#fff" />
          <rect x="500" y="14" width="20" height="52" rx="6" fill="#fff" />
          <rect x="478" y="22" width="14" height="36" rx="5" fill="#fff" />
        </svg>
        <div className="font-head text-[64px] font-black italic leading-none tracking-tight text-transparent [-webkit-text-stroke:2px_#fff]">MUSCLE</div>
        <div className="font-head text-[120px] font-black italic leading-[0.95] tracking-tight">UP</div>
        <p className="mt-6 max-w-md text-lg font-medium text-white/85">Gérez votre salle depuis un seul endroit : adhérents, abonnements, caisse et planning, synchronisés avec l’application.</p>
      </div>

      <ul className="relative grid max-w-md gap-3 text-sm font-semibold text-white/90">
        {[
          ['groups', 'Adhérents et abonnements'],
          ['payments', 'Caisse et encaissements'],
          ['calendar_month', 'Planning et pointage des cours'],
        ].map(([icon, label]) => (
          <li key={label} className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-xl bg-white/15">
              <Icon name={icon} size={18} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

type Step = 'login' | 'forgot' | 'reset'
const YEAR = new Date().getFullYear()

export function LoginPage() {
  const user = useAuth((s) => s.user)
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (user) return <Navigate to={from} replace />

  const go = (next: Step) => {
    setStep(next)
    setError(null)
    setInfo(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (step === 'login') {
        await login(email.trim(), password)
        navigate(from, { replace: true })
      } else if (step === 'forgot') {
        await api.post('/v1/auth/forgot-password', { email: email.trim(), lang: 'fr' })
        setInfo('Si ce compte existe, un code à 6 chiffres vient d’être envoyé par e-mail.')
        setStep('reset')
      } else {
        await api.post('/v1/auth/reset-password', { email: email.trim(), code: code.trim(), newPassword })
        setPassword('')
        setCode('')
        setNewPassword('')
        setStep('login')
        setInfo('Mot de passe modifié. Vous pouvez vous connecter.')
      }
    } catch (err) {
      if (err instanceof NotTeamError) setError('Ce compte n’a pas accès au back-office. L’accès est réservé à l’accueil et à l’administration.')
      else if (apiErrorCode(err) === 'OTP_RATE_LIMITED') setError('Trop de codes demandés. Patientez quelques minutes avant de réessayer.')
      else if (step === 'reset') setError(apiErrorMessage(err, 'Code invalide ou expiré.'))
      else setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const title = step === 'login' ? 'Connexion' : step === 'forgot' ? 'Mot de passe oublié' : 'Nouveau mot de passe'
  const subtitle =
    step === 'login' ? 'Espace réservé à l’équipe : accueil et administration.' : step === 'forgot' ? 'Saisissez votre e-mail pour recevoir un code de réinitialisation.' : 'Saisissez le code reçu par e-mail et choisissez un nouveau mot de passe.'

  return (
    <div className="flex min-h-svh bg-surface">
      <BrandPanel />
      <main className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[540px] lg:shrink-0">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-pressed text-white">
            <LogoMark size={24} />
          </span>
          <span className="font-head text-xl font-extrabold">MuscleUP</span>
        </div>

        <form onSubmit={submit} className="pop-in flex w-full max-w-sm flex-col gap-5" noValidate>
          <div>
            <h1 className="text-[30px] leading-tight">{title}</h1>
            <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
          </div>

          {info ? (
            <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-ink">
              <Icon name="check_circle" size={20} />
              {info}
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">
              <Icon name="error" size={20} />
              {error}
            </div>
          ) : null}

          <Field label="Adresse e-mail" icon="mail" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@salle.com" readOnly={step === 'reset'} />

          {step === 'login' ? (
            <Field
              label="Mot de passe"
              icon="lock"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              trailing={
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2">
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              }
            />
          ) : null}

          {step === 'reset' ? (
            <>
              <Field label="Code à 6 chiffres" icon="pin" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
              <Field label="Nouveau mot de passe" icon="lock" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8 caractères minimum" />
            </>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={busy}
            disabled={!email.trim() || (step === 'login' && password.length < 8) || (step === 'reset' && (code.length !== 6 || newPassword.length < 8))}
            icon={step === 'login' ? 'login' : step === 'forgot' ? 'send' : 'check'}
            className="w-full"
          >
            {step === 'login' ? 'Se connecter' : step === 'forgot' ? 'Envoyer le code' : 'Modifier le mot de passe'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            {step === 'login' ? (
              <button type="button" onClick={() => go('forgot')} className="font-bold text-primary-ink hover:underline">
                Mot de passe oublié ?
              </button>
            ) : (
              <button type="button" onClick={() => go('login')} className="inline-flex items-center gap-1 font-bold text-primary-ink hover:underline">
                <Icon name="arrow_back" size={16} /> Retour à la connexion
              </button>
            )}
          </div>
        </form>

        <p className="mt-10 text-xs text-muted">© {YEAR} MuscleUP · Back-office</p>
      </main>
    </div>
  )
}
