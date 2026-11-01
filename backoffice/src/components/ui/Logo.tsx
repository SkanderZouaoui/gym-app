/** Haltère de la marque (même motif que l'écran de connexion mobile). */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="9" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="5" y="6.5" width="3" height="11" rx="1.2" fill="currentColor" />
      <rect x="8" y="11" width="8" height="2" rx="1" fill="currentColor" />
      <rect x="16" y="6.5" width="3" height="11" rx="1.2" fill="currentColor" />
      <rect x="19" y="9" width="3" height="6" rx="1" fill="currentColor" />
    </svg>
  )
}
