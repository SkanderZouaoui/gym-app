import type { ReactNode } from 'react'

export function Drawer({
  title,
  subtitle,
  icon,
  tone = 'primary',
  initials,
  photoUrl,
  badge,
  badgeTone = 'primary',
  onClose,
  footer,
  onDelete,
  children,
}: {
  title: string
  subtitle?: string
  icon?: string
  tone?: string
  initials?: string
  /** Photo de profil (URL signée) affichée à la place des initiales. */
  photoUrl?: string | null
  badge?: string
  badgeTone?: string
  onClose: () => void
  footer: ReactNode
  onDelete?: () => void
  children: ReactNode
}) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex justify-end bg-black/45">
      <aside
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-w-md flex-col bg-(--color-surface) shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-(--color-border) px-5 py-4.5">
          {initials && photoUrl ? (
            <img src={photoUrl} alt="" className="h-12 w-12 flex-none rounded-full bg-(--color-surface-2) object-cover" />
          ) : initials ? (
            <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-(--color-secondary) font-head text-[15px] font-bold text-white">
              {initials}
            </span>
          ) : icon ? (
            <span
              className="grid h-12 w-12 flex-none place-items-center rounded-lg"
              style={{ background: `var(--color-${tone}-soft)`, color: `var(--color-${tone}-ink)` }}
            >
              <span className="material-symbols-rounded text-[24px]">{icon}</span>
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="truncate font-head text-[19px] font-extrabold tracking-tight">{title}</div>
            {subtitle ? <div className="text-[13px] text-(--color-muted)">{subtitle}</div> : null}
          </div>
          {badge ? (
            <span
              className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ background: `var(--color-${badgeTone}-soft)`, color: `var(--color-${badgeTone}-ink)` }}
            >
              {badge}
            </span>
          ) : null}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg hover:bg-(--color-surface-2)"
          >
            <span className="material-symbols-rounded text-[22px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-4">{children}</div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-(--color-border) px-5 py-3.5">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-(--color-danger-border) px-3 text-[13.5px] font-bold text-(--color-danger-ink) hover:bg-(--color-danger-soft)"
            >
              <span className="material-symbols-rounded text-[18px]">delete</span>
              Supprimer
            </button>
          ) : null}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-(--color-border-strong) px-3.5 text-[13.5px] font-bold hover:bg-(--color-surface-2)"
          >
            Annuler
          </button>
          {footer}
        </div>
      </aside>
    </div>
  )
}
