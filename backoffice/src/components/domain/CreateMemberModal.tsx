import { useMemo, useState } from 'react'
import { apiErrorCode, apiErrorMessage } from '../../api/client'
import { useCreateMember, usePlans, type CreatedMember } from '../../api/hooks'
import { generatePassword } from '../../lib/membership'
import { formatMoney, METHOD_LABEL, type PaymentMethod } from '../../lib/format'
import { Button, Field, Icon, Modal, useToast } from '../ui'
import { MethodPicker, PlanPicker } from './PlanPicker'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const toast = useToast()
  const [shown, setShown] = useState(!secret)
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
        <div className={`truncate font-head text-lg font-bold ${secret ? 'tracking-widest' : ''}`}>{shown ? value : '••••••••••'}</div>
      </div>
      {secret ? <button onClick={() => setShown((s) => !s)} aria-label="Afficher" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2"><Icon name={shown ? 'visibility_off' : 'visibility'} size={20} /></button> : null}
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          toast('Copié')
        }}
        aria-label={`Copier ${label}`}
        className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary-ink hover:bg-primary-border/60"
      >
        <Icon name="content_copy" size={18} />
      </button>
    </div>
  )
}

/**
 * Création d'un adhérent par l'accueil (comme « Créer un compte » côté mobile) : le compte, l'abonnement et l'encaissement
 * sont créés ensemble, avec un mot de passe provisoire à remettre à l'adhérent.
 */
export function CreateMemberModal({ onClose }: { onClose: () => void }) {
  const create = useCreateMember()
  const { data: plans } = usePlans()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [planId, setPlanId] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [error, setError] = useState<{ text: string; field?: 'email' | 'phone' } | null>(null)
  const [created, setCreated] = useState<{ member: CreatedMember; password: string; plan: string; amount: number; method: PaymentMethod } | null>(null)
  const plan = plans?.find((p) => p.id === planId)
  const emailOk = EMAIL.test(email.trim())
  const valid = firstName.trim() && lastName.trim() && emailOk && plan
  const password = useMemo(() => generatePassword(), [])

  const submit = () => {
    if (!valid || !plan) return
    setError(null)
    create.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() || undefined, password, planId: plan.id, paymentMethod: method },
      {
        onSuccess: (member) => setCreated({ member, password, plan: plan.name, amount: member.payment?.amount ?? Math.round(Number(plan.price)), method }),
        onError: (e) => {
          const code = apiErrorCode(e)
          if (code === 'EMAIL_TAKEN') setError({ text: 'Cette adresse e-mail est déjà utilisée.', field: 'email' })
          else if (code === 'PHONE_TAKEN') setError({ text: 'Ce numéro de téléphone est déjà utilisé.', field: 'phone' })
          else setError({ text: apiErrorMessage(e, 'Impossible de créer le compte.') })
        },
      },
    )
  }

  if (created) {
    const { member } = created
    return (
      <Modal title="Compte créé" onClose={onClose} footer={<Button onClick={onClose}>Terminé</Button>}>
        <div className="flex flex-col items-center gap-1.5 pb-5 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success-ink"><Icon name="how_to_reg" size={34} filled /></span>
          <div className="font-head text-xl font-bold">{member.firstName} {member.lastName}</div>
          <div className="text-sm text-muted">{created.plan} · {formatMoney(created.amount)} · {METHOD_LABEL[created.method]}</div>
        </div>
        <div className="divide-y divide-border rounded-2xl border border-border">
          {member.memberCode ? <CopyRow label="Code adhérent" value={member.memberCode} /> : null}
          <CopyRow label="E-mail" value={member.email ?? email} />
          <CopyRow label="Mot de passe provisoire" value={created.password} secret />
        </div>
        <p className="mt-4 flex gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-[13px] font-semibold text-warning-ink">
          <Icon name="info" size={18} />
          Remettez ce mot de passe à l’adhérent : il devra le changer à sa première connexion. Il ne sera plus affiché ensuite.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      title="Nouvel adhérent"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button icon="person_add" disabled={!valid} loading={create.isPending} onClick={submit}>Créer et encaisser</Button>
        </>
      }
    >
      <div className="space-y-6">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error.text}</div> : null}
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" icon="person" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
          <Field label="Nom" icon="badge" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Field
            label="E-mail"
            icon="mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error?.field === 'email' ? 'Déjà utilisée' : email.length > 3 && !emailOk ? 'Adresse invalide' : undefined}
          />
          <Field label="Téléphone" icon="call" inputMode="tel" placeholder="22 222 222" value={phone} onChange={(e) => setPhone(e.target.value)} error={error?.field === 'phone' ? 'Déjà utilisé' : undefined} />
        </section>
        <section className="space-y-2.5">
          <h3 className="text-sm font-bold">Formule</h3>
          <PlanPicker value={planId} onChange={setPlanId} />
        </section>
        <section className="space-y-2.5">
          <h3 className="text-sm font-bold">Moyen de paiement</h3>
          <MethodPicker value={method} onChange={setMethod} />
        </section>
      </div>
    </Modal>
  )
}
