/** Pictogramme Material Symbols (mêmes noms que @expo/vector-icons côté mobile pour la plupart). */
export function Icon({ name, size = 20, className = '', filled = false }: { name: string; size?: number; className?: string; filled?: boolean }) {
  return (
    <span
      aria-hidden
      className={`material-symbols-rounded ${className}`}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' 24` }}
    >
      {name}
    </span>
  )
}
