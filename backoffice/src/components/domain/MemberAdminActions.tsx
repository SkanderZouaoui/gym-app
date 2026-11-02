import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { useCancelMembership, useDeleteMember, useExtendMembership, useSetMemberStatus, useSetMembershipSuspended } from '../../api/hooks'
import type { Member, Membership } from '../../api/types'
import { formatDate } from '../../lib/format'
import { Button, Card, ConfirmDialog, Field, Modal, SectionHeader, useToast, cn } from '../ui'

const PRESETS = [7, 15, 30, 90]

function ExtendModal({ membership, onClose }: { membership: Membership; onClose: () => void }) {
  const toast = useToast()
  const extend = useExtendMembership()
  const [days, setDays] = useState('30')
  const n = Number(days)
  const newEnd = new Date(new Date(membership.endDate).getTime() + (Number.isFinite(n) ? n : 0) * 86_400_000)
  return (
    <Modal
      title="Prolonger l’abonnement"
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button icon="update" disabled={!(n >= 1)} loading={extend.isPending} onClick={() => extend.mutate({ id: membership.id, days: n }, { onSuccess: () => { toast(`Abonnement prolongé de ${n} jour${n > 1 ? 's' : ''}`); onClose() }, onError: (e) => toast(apiErrorMessage(e), 'danger') })}>Prolonger</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => <button key={p} onClick={() => setDays(String(p))} className={cn('h-10 rounded-full px-4 text-sm font-bold transition', n === p ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}>{p} jours</button>)}
        </div>
        <Field label="Nombre de jours" icon="event_repeat" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">Fin actuelle : <b className="text-text">{formatDate(membership.endDate)}</b>{n >= 1 ? <> → nouvelle fin : <b className="text-text">{formatDate(newEnd)}</b></> : null}</p>
      </div>
    </Modal>
  )
}

/**
 * Actions d'administration sur un adhérent (réservées à l'admin, comme l'API) : prolonger, suspendre ou annuler
 * son abonnement, suspendre ou réactiver son compte, le supprimer.
 */
export function MemberAdminActions({ member, current, onDeleted }: { member: Member; current?: Membership; onDeleted: () => void }) {
  const toast = useToast()
  const status = useSetMemberStatus()
  const remove = useDeleteMember()
  const suspendMembership = useSetMembershipSuspended()
  const cancel = useCancelMembership()
  const [extending, setExtending] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'cancel' | null>(null)
  const accountSuspended = member.status === 'SUSPENDED'
  const membershipSuspended = current?.status === 'SUSPENDED'
  const live = current && (current.status === 'ACTIVE' || current.status === 'SUSPENDED')
  const fail = (e: unknown) => toast(apiErrorMessage(e), 'danger')

  return (
    <section className="space-y-2.5">
      <SectionHeader title="Administration" icon="admin_panel_settings" />
      <Card className="space-y-4 p-4">
        {current ? (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Abonnement · {current.plan.name}</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" icon="update" onClick={() => setExtending(true)}>Prolonger</Button>
              {live ? (
                <Button size="sm" variant="outline" icon={membershipSuspended ? 'play_circle' : 'pause_circle'} loading={suspendMembership.isPending} onClick={() => suspendMembership.mutate({ id: current.id, suspended: !membershipSuspended }, { onSuccess: () => toast(membershipSuspended ? 'Abonnement réactivé' : 'Abonnement suspendu'), onError: fail })}>
                  {membershipSuspended ? 'Réactiver' : 'Suspendre'}
                </Button>
              ) : null}
              {live ? <Button size="sm" variant="danger" icon="event_busy" onClick={() => setConfirm('cancel')}>Annuler l’abonnement</Button> : null}
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Compte</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={accountSuspended ? 'lock_open' : 'block'} loading={status.isPending} onClick={() => status.mutate({ id: member.id, suspended: !accountSuspended }, { onSuccess: () => toast(accountSuspended ? 'Compte réactivé' : 'Compte suspendu'), onError: fail })}>
              {accountSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
            </Button>
            <Button size="sm" variant="danger" icon="delete" onClick={() => setConfirm('delete')}>Supprimer l’adhérent</Button>
          </div>
        </div>
      </Card>

      {extending && current ? <ExtendModal membership={current} onClose={() => setExtending(false)} /> : null}
      {confirm === 'cancel' && current ? (
        <ConfirmDialog danger title="Annuler cet abonnement ?" message={`L’abonnement « ${current.plan.name} » de ${member.firstName} ${member.lastName} sera annulé immédiatement.`} confirmLabel="Annuler l’abonnement" loading={cancel.isPending} onClose={() => setConfirm(null)}
          onConfirm={() => cancel.mutate({ id: current.id }, { onSuccess: () => { toast('Abonnement annulé'); setConfirm(null) }, onError: (e) => { fail(e); setConfirm(null) } })} />
      ) : null}
      {confirm === 'delete' ? (
        <ConfirmDialog danger title={`Supprimer ${member.firstName} ${member.lastName} ?`} message="Le compte est désactivé et l’adhérent ne peut plus se connecter. Ses paiements restent dans l’historique de la caisse." confirmLabel="Supprimer" loading={remove.isPending} onClose={() => setConfirm(null)}
          onConfirm={() => remove.mutate(member.id, { onSuccess: () => { toast('Adhérent supprimé'); onDeleted() }, onError: (e) => { fail(e); setConfirm(null) } })} />
      ) : null}
    </section>
  )
}
