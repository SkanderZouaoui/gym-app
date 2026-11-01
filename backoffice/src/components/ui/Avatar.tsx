import { useState } from 'react'
import { cn } from './cn'

/** Photo de profil, ou initiales sur fond violet (comme les avatars mobile). */
export function Avatar({ firstName, lastName, photoUrl, size = 40, className }: { firstName: string; lastName: string; photoUrl?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.38 }
  // Si la photo ne se charge pas (URL expirée, stockage injoignable), on retombe sur les initiales.
  const [failed, setFailed] = useState<string | null>(null)
  if (photoUrl && failed !== photoUrl) return <img src={photoUrl} alt="" style={style} onError={() => setFailed(photoUrl)} className={cn('shrink-0 rounded-full object-cover', className)} />
  return (
    <span
      style={style}
      className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-pressed font-head font-bold text-primary-contrast', className)}
    >
      {`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()}
    </span>
  )
}
