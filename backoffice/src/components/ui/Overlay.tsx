import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { cn } from './cn'
import { Button, IconButton } from './Button'

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])
}

/** Panneau latéral (fiche adhérent, détail d'un cours…). */
export function Drawer({ title, subtitle, onClose, footer, children, width = 'max-w-xl' }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; footer?: ReactNode; children: ReactNode; width?: string }) {
  useEscape(onClose)
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fade-in absolute inset-0 bg-secondary/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside role="dialog" aria-modal className={cn('slide-in relative flex h-full w-full flex-col bg-bg shadow-pop', width)}>
        <header className="flex items-start gap-3 border-b border-border bg-surface px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl">{title}</h2>
            {subtitle ? <div className="mt-0.5 text-sm text-muted">{subtitle}</div> : null}
          </div>
          <IconButton icon="close" label="Fermer" onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="flex items-center gap-2 border-t border-border bg-surface px-6 py-4">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  )
}

export function Modal({ title, onClose, children, footer, width = 'max-w-lg' }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEscape(onClose)
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="fade-in absolute inset-0 bg-secondary/40 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal className={cn('pop-in relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-surface shadow-pop', width)}>
        <header className="flex items-center gap-3 border-b border-border px-6 py-4">
          <h2 className="min-w-0 flex-1 truncate text-lg">{title}</h2>
          <IconButton icon="close" label="Fermer" onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirmer', danger, loading, onConfirm, onClose }: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', danger ? 'bg-danger-soft text-danger-ink' : 'bg-primary-soft text-primary-ink')}>
          <Icon name={danger ? 'warning' : 'help'} size={22} />
        </span>
        <div className="pt-1.5 text-sm text-muted">{message}</div>
      </div>
    </Modal>
  )
}
