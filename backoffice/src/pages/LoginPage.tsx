import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api, apiErrorCode, apiErrorMessage } from '../api/client'
import { NotTeamError, useAuth } from '../store/auth'
import { Button, Icon } from '../components/ui'
import logoMark from '../assets/logo-mark.png'
import logoWord from '../assets/logo-word.png'

/** Habillage de gauche : même identité que l'écran de connexion mobile (photo d'ambiance, logo, accroche). */
function BrandPanel() {
  return (
    <div className="relative hidden w-1/2 max-w-[760px] shrink-0 overflow-hidden bg-[#1b1432] text-white lg:flex lg:flex-col lg:justify-between lg:p-16">
      {/* Placeholder de la photo athlète : rayures violettes sombres, comme dans la maquette. */}
      <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#271c44_0_16px,#1b1432_16px_32px)]" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f]/55 to-[#0b0b0f]/85" />

      <div className="relative flex flex-col">
        <img src={logoMark} alt="MuscleUP" className="h-[68px] w-auto self-start" />
        <img src={logoWord} alt="" className="mt-1 h-4 w-auto self-start" />
      </div>

      <h2 className="relative max-w-[560px] font-display text-[72px] font-extrabold uppercase leading-[0.95] tracking-[-0.02em]">
        Prêt à dépasser tes limites ?
      </h2>
    </div>
  )
}

/** Champ de la maquette : icône, saisie, halo violet au focus ; bordure rouge en cas d'erreur. */
function LoginField({ icon, label, error, trailing, ...input }: { icon: string; label: string; error?: boolean; trailing?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={`flex h-14 items-center gap-2.5 rounded-2xl border-[1.5px] bg-surface pl-3.5 pr-1 shadow-[0_2px_8px_rgba(60,30,120,0.08)] transition focus-within:border-[#7c3aed] focus-within:shadow-[0_0_0_4px_rgba(124,58,237,0.25)] ${error ? 'border-danger' : 'border-[#e2ddf0]'}`}
    >
      <Icon name={icon} size={22} className="shrink-0 text-muted" />
      <input aria-label={label} placeholder={label} className="h-full min-w-0 flex-1 border-0 bg-transparent text-base font-medium text-text outline-none placeholder:text-[#8b8896]" {...input} />
      {trailing}
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
    <div className="flex min-h-svh bg-bg">
      <BrandPanel />
      <main className="flex w-full flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 flex flex-col items-center rounded-2xl bg-[#1b1432] px-6 py-4 lg:hidden">
          <img src={logoMark} alt="MuscleUP" className="h-10 w-auto" />
          <img src={logoWord} alt="" className="mt-1 h-3 w-auto" />
        </div>

        <form onSubmit={submit} className="pop-in flex w-full max-w-[440px] flex-col gap-3" noValidate>
          <div className="mb-1">
            <h1 className="font-sans text-[15px] font-extrabold uppercase tracking-[0.14em] text-primary-ink">{title}</h1>
            <p className="mt-2 text-[15px] text-muted">{subtitle}</p>
          </div>

          {info ? (
            <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-ink">
              <Icon name="check_circle" size={20} />
              {info}
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="flex items-start gap-2 text-[13px] font-semibold leading-snug text-danger-ink">
              <Icon name="error" size={18} className="shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <LoginField icon="mail" label="E-mail" type="email" inputMode="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} readOnly={step === 'reset'} error={!!error && step === 'login'} />

            {step === 'login' ? (
              <LoginField
                icon="lock"
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!error}
                trailing={
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="grid size-12 place-items-center rounded-full text-muted hover:text-text">
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={22} />
                  </button>
                }
              />
            ) : null}

            {step === 'reset' ? (
              <>
                <LoginField icon="pin" label="Code à 6 chiffres" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                <LoginField icon="lock" label="Nouveau mot de passe (8 caractères minimum)" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </>
            ) : null}
          </div>

          <div className="flex justify-end">
            {step === 'login' ? (
              <button type="button" onClick={() => go('forgot')} className="inline-flex min-h-12 items-center text-sm font-semibold text-primary-ink hover:underline">
                Mot de passe oublié ?
              </button>
            ) : (
              <button type="button" onClick={() => go('login')} className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-primary-ink hover:underline">
                <Icon name="arrow_back" size={16} /> Retour à la connexion
              </button>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            loading={busy}
            disabled={!email.trim() || (step === 'login' && password.length < 8) || (step === 'reset' && (code.length !== 6 || newPassword.length < 8))}
            icon={step === 'login' ? 'login' : step === 'forgot' ? 'send' : 'check'}
            className="h-[60px] w-full !rounded-2xl text-base font-extrabold uppercase tracking-wider shadow-[0_10px_30px_rgba(124,58,237,0.45)]"
          >
            {step === 'login' ? 'Se connecter' : step === 'forgot' ? 'Envoyer le code' : 'Modifier le mot de passe'}
          </Button>
        </form>

        <p className="mt-10 text-xs text-muted">© {YEAR} MuscleUP · Back-office</p>
      </main>
    </div>
  )
}
