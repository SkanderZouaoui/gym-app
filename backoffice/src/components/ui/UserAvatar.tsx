import { useState } from 'react'

/** Pastille ronde : photo de profil si l'utilisateur en a une, sinon ses initiales. */
export function UserAvatar({ firstName, lastName, photoUrl, className = 'h-8 w-8 text-xs' }: {
  firstName: string
  lastName: string
  photoUrl?: string | null
  className?: string
}) {
  // URL signée expirée ou illisible : retour aux initiales.
  const [failed, setFailed] = useState<string | null>(null)
  if (photoUrl && failed !== photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        onError={() => setFailed(photoUrl)}
        className={`${className} flex-none rounded-full bg-(--color-surface-2) object-cover`}
      />
    )
  }
  return (
    <span className={`${className} grid flex-none place-items-center rounded-full bg-(--color-secondary-soft) font-bold text-(--color-secondary-ink)`}>
      {`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()}
    </span>
  )
}
