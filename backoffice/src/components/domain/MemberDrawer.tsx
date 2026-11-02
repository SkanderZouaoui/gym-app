import { useState } from 'react'
import { useMember, useMemberMemberships, useMemberPayments } from '../../api/hooks'
import { daysLeft, formatDate, formatMoney, METHOD_ICON, METHOD_LABEL } from '../../lib/format'
import { membershipBadge } from '../../lib/membership'
import { Avatar, Badge, Button, Card, Drawer, EmptyState, Icon, SectionHeader, Skeleton, useToast } from '../ui'
import { SellModal } from './SellModal'
import { MemberAdminActions } from './MemberAdminActions'
import { useAuth } from '../../store/auth'

function CopyValue({ icon, label, value, href }: { icon: string; label: string; value: string | null | undefined; href?: string }) {
  const toast = useToast()
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name={icon} size={18} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
        {value ? (
          href ? <a href={href} className="block truncate text-sm font-bold hover:text-primary-ink">{value}</a> : <div className="truncate text-sm font-bold">{value}</div>
        ) : (
          <div className="text-sm text-muted">Non renseigné</div>
        )}
      </div>
      {value ? (
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            toast('Copié')
          }}
          aria-label={`Copier ${label}`}
          className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        >
          <Icon name="content_copy" size={17} />
        </button>
      ) : null}
    </div>
  )
}

/** Fiche d'un adhérent (équivalent de l'écran « profil adhérent » du staff mobile). */
export function MemberDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: member, isLoading } = useMember(id)
  const { data: memberships } = useMemberMemberships(id)
  const { data: payments = [] } = useMemberPayments(memberships)
  const [selling, setSelling] = useState(false)
  const isAdmin = useAuth((s) => s.activeRole === 'ADMIN')

  const sorted = [...(memberships ?? [])].sort((a, b) => b.endDate.localeCompare(a.endDate))
  const current = sorted[0]
  const left = current ? daysLeft(current.endDate) : null
  const total = current ? Math.max(1, Math.round((new Date(current.endDate).getTime() - new Date(current.startDate).getTime()) / 86_400_000)) : 1
  const elapsed = current && left !== null ? Math.min(100, Math.max(0, Math.round(((total - left) / total) * 100))) : 0
  const paidTotal = payments.reduce((n, p) => n + Number(p.amount), 0)
  const badge = member ? membershipBadge({ memberships: current ? [{ status: current.status, endDate: current.endDate, plan: { name: current.plan.name } }] : [] }) : null

  return (
    <>
      <Drawer
        title={member ? `${member.firstName} ${member.lastName}` : 'Adhérent'}
        subtitle={member ? (member.memberCode ? `Code adhérent ${member.memberCode}` : undefined) : undefined}
        onClose={onClose}
        footer={
          member ? (
            <Button icon="payments" className="w-full" onClick={() => setSelling(true)}>
              {current ? "Renouveler l'abonnement" : 'Souscrire un abonnement'}
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
        ) : !member ? (
          <EmptyState icon="person_off" title="Adhérent introuvable" hint="Ce compte n’existe plus ou a été supprimé." />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar firstName={member.firstName} lastName={member.lastName} photoUrl={member.photoUrl} size={72} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-head text-2xl font-bold">{member.firstName} {member.lastName}</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {badge ? <Badge tone={badge.tone} dot>{badge.label}</Badge> : null}
                  {member.status !== 'ACTIVE' ? <Badge tone="warning">Compte {member.status === 'SUSPENDED' ? 'suspendu' : member.status.toLowerCase()}</Badge> : null}
                </div>
              </div>
            </div>

            {current ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-[#5b21b6] p-5 text-white shadow-primary">
                <div className="pointer-events-none absolute -right-12 -top-14 size-44 rounded-full bg-white/10" />
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">Abonnement</div>
                <div className="mt-1 font-head text-2xl font-extrabold">{current.plan.name}</div>
                <div className="mt-0.5 text-sm text-white/80">{formatDate(current.startDate)} → {formatDate(current.endDate)}</div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${elapsed}%` }} /></div>
                <div className="mt-2 flex justify-between text-[13px] font-semibold text-white/90">
                  <span>{elapsed} % écoulé</span>
                  <span>{current.status === 'ACTIVE' && left !== null ? `${Math.max(0, left)} jour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}` : 'Expiré'}</span>
                </div>
              </div>
            ) : (
              <Card className="flex flex-col items-center gap-1 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-ink"><Icon name="card_membership" size={24} /></span>
                <div className="mt-1 font-head text-lg font-bold">Pas encore d’abonnement</div>
                <p className="text-sm text-muted">Souscrivez une formule pour que l’adhérent puisse réserver et accéder à la salle.</p>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                [String(sorted.length), 'Abonnements'],
                [String(payments.length), 'Paiements'],
                [formatMoney(paidTotal), 'Encaissé'],
              ].map(([n, l]) => (
                <Card key={l} className="px-3 py-4 text-center">
                  <div className="font-head text-xl font-extrabold">{n}</div>
                  <div className="text-xs font-semibold text-muted">{l}</div>
                </Card>
              ))}
            </div>

            <section className="space-y-2.5">
              <SectionHeader title="Coordonnées" icon="contact_phone" />
              <Card className="divide-y divide-border overflow-hidden">
                <CopyValue icon="call" label="Téléphone" value={member.phone} href={member.phone ? `tel:${member.phone.replace(/\s+/g, '')}` : undefined} />
                <CopyValue icon="mail" label="E-mail" value={member.email} href={member.email ? `mailto:${member.email}` : undefined} />
                {member.createdAt ? <CopyValue icon="event" label="Membre depuis" value={formatDate(member.createdAt)} /> : null}
              </Card>
            </section>

            {isAdmin || current ? <MemberAdminActions member={member} current={current} isAdmin={isAdmin} onDeleted={onClose} /> : null}

            <section className="space-y-2.5">
              <SectionHeader title="Paiements" icon="receipt_long" />
              <Card className="divide-y divide-border overflow-hidden">
                {payments.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">Aucun paiement enregistré.</p>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name={METHOD_ICON[p.method]} size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{p.planName}</div>
                        <div className="text-xs text-muted">{formatDate(p.recordedAt)} · {METHOD_LABEL[p.method]}</div>
                      </div>
                      <div className="font-head text-sm font-extrabold">{formatMoney(p.amount)}</div>
                    </div>
                  ))
                )}
              </Card>
            </section>
          </div>
        )}
      </Drawer>
      {selling && member ? <SellModal member={member} onClose={() => setSelling(false)} /> : null}
    </>
  )
}
