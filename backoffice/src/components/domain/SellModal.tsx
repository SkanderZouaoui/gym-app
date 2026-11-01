import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { useMembers, useSellMembership, usePlans } from '../../api/hooks'
import type { Member } from '../../api/types'
import { useDebounce } from '../../lib/hooks'
import { formatDate, formatMoney, METHOD_LABEL, type PaymentMethod } from '../../lib/format'
import { Avatar, Button, Icon, Modal, SearchInput, Skeleton, useToast } from '../ui'
import { MethodPicker, PlanPicker } from './PlanPicker'

function MemberSearch({ onPick }: { onPick: (m: Member) => void }) {
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query.trim(), 250)
  const { members, isLoading } = useMembers(debounced)
  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un adhérent (nom, téléphone, e-mail…)" />
      <div className="max-h-72 overflow-y-auto rounded-2xl border border-border">
        {isLoading ? (
          <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : members.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Aucun adhérent trouvé.</p>
        ) : (
          members.map((m) => (
            <button key={m.id} onClick={() => onPick(m)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-primary-soft/50">
              <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{m.firstName} {m.lastName}</span>
                <span className="block truncate text-xs text-muted">{m.phone ?? m.email ?? '—'}</span>
              </span>
              <Icon name="chevron_right" size={20} className="text-muted" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Encaissement d'un abonnement (même parcours que « Encaisser » côté mobile) : adhérent, formule, moyen de paiement,
 * puis reçu. Sans adhérent fourni, on le cherche d'abord.
 */
export function SellModal({ member: initial, onClose }: { member?: Member; onClose: () => void }) {
  const toast = useToast()
  const sell = useSellMembership()
  const { data: plans } = usePlans()
  const [member, setMember] = useState<Member | undefined>(initial)
  const [planId, setPlanId] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<{ id: string; plan: string; amount: number; method: PaymentMethod; date: string; end: string } | null>(null)
  const plan = plans?.find((p) => p.id === planId)

  const submit = () => {
    if (!member || !plan) return
    setError(null)
    const amount = Math.round(Number(plan.price))
    sell.mutate(
      { userId: member.id, planId: plan.id, amount, method },
      {
        onSuccess: ({ membership, payment }) => {
          toast('Encaissement enregistré')
          setReceipt({ id: payment.id, plan: plan.name, amount, method, date: new Date().toISOString(), end: membership.endDate })
        },
        onError: (e) => setError(apiErrorMessage(e, "Impossible d'enregistrer l'encaissement.")),
      },
    )
  }

  if (receipt && member) {
    return (
      <Modal
        title="Encaissement enregistré"
        onClose={onClose}
        footer={
          <>
            <Button variant="outline" icon="print" onClick={() => window.print()}>Imprimer</Button>
            <Button onClick={onClose}>Terminé</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-2 pb-5 pt-1 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success-ink"><Icon name="check_circle" size={36} filled /></span>
          <div className="font-head text-3xl font-extrabold">{formatMoney(receipt.amount)}</div>
          <div className="text-sm text-muted">{METHOD_LABEL[receipt.method]} · {formatDate(receipt.date)}</div>
        </div>
        <dl className="divide-y divide-border rounded-2xl border border-border text-sm">
          {[
            ['Adhérent', `${member.firstName} ${member.lastName}`],
            ['Formule', receipt.plan],
            ['Valable jusqu’au', formatDate(receipt.end)],
            ['Référence', receipt.id.slice(0, 8).toUpperCase()],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{k}</dt>
              <dd className="font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    )
  }

  return (
    <Modal
      title={member ? 'Encaisser un abonnement' : 'Nouvelle vente'}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        member ? (
          <>
            <div className="mr-auto text-sm">
              {plan ? <span className="text-muted">Total <b className="font-head text-lg text-text">{formatMoney(Math.round(Number(plan.price)))}</b></span> : <span className="text-muted">Choisissez une formule</span>}
            </div>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button icon="payments" loading={sell.isPending} disabled={!plan} onClick={submit}>Encaisser</Button>
          </>
        ) : undefined
      }
    >
      {!member ? (
        <MemberSearch onPick={setMember} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5">
            <Avatar firstName={member.firstName} lastName={member.lastName} photoUrl={member.photoUrl} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{member.firstName} {member.lastName}</div>
              <div className="truncate text-sm text-muted">{member.phone ?? member.email ?? '—'}</div>
            </div>
            {!initial ? <button onClick={() => setMember(undefined)} className="text-sm font-bold text-primary-ink hover:underline">Changer</button> : null}
          </div>
          {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold">Formule</h3>
            <PlanPicker value={planId} onChange={setPlanId} />
          </section>
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold">Moyen de paiement</h3>
            <MethodPicker value={method} onChange={setMethod} />
          </section>
        </div>
      )}
    </Modal>
  )
}
