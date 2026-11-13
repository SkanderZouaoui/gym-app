import { Icon, cn } from './ui'

export type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

/** Bouton d'envoi de la connexion (même comportement que sur mobile) : au clic il se contracte en cercle avec un anneau qui tourne,
 * puis devient vert avec une coche qui se dessine (succès) ou rouge avec une croix et une secousse (échec). */
export function AuthSubmitButton({ status, label, icon, disabled }: { status: SubmitStatus; label: string; icon: string; disabled?: boolean }) {
  const round = status !== 'idle'
  const bg = status === 'success' ? 'bg-success shadow-[0_10px_28px_rgba(22,163,74,0.45)]' : status === 'error' ? 'bg-danger shadow-[0_10px_28px_rgba(220,38,38,0.45)]' : 'bg-primary shadow-[0_10px_30px_rgba(124,58,237,0.45)]'
  return (
    <div className="flex justify-center">
      <button
        type="submit"
        disabled={disabled || round}
        aria-label={status === 'idle' ? label : status === 'loading' ? 'Connexion en cours' : status === 'success' ? 'Succès' : 'Échec'}
        style={{ width: round ? 60 : '100%', borderRadius: round ? 30 : 16 }}
        className={cn(
          'flex h-[60px] items-center justify-center gap-2 overflow-hidden text-base font-extrabold uppercase tracking-wider text-white transition-[width,border-radius,background-color,box-shadow] duration-[400ms] ease-[cubic-bezier(.6,0,.2,1)] disabled:cursor-not-allowed',
          bg,
          status === 'idle' && disabled && 'opacity-50',
          status === 'success' && 'btn-bounce',
          status === 'error' && 'btn-shake',
        )}
      >
        {status === 'idle' ? (
          <>
            <Icon name={icon} size={22} />
            <span className="whitespace-nowrap">{label}</span>
          </>
        ) : status === 'loading' ? (
          <span className="size-[26px] animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
        ) : status === 'success' ? (
          <svg width="34" height="34" viewBox="0 0 76 76" aria-hidden>
            <path d="M20 39 L33 52 L56 26" className="draw-stroke" style={{ fill: 'none', stroke: '#fff', strokeWidth: 7, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
          </svg>
        ) : (
          <svg width="34" height="34" viewBox="0 0 76 76" aria-hidden>
            <path d="M24 24 L52 52 M52 24 L24 52" className="draw-stroke" style={{ fill: 'none', stroke: '#fff', strokeWidth: 7, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
          </svg>
        )}
      </button>
    </div>
  )
}
