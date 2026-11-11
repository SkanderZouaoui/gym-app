import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import {
  useAudiences, useCancelScheduledNotification, useCreateNotificationRule, useDeleteNotificationRule, useNotificationHistory, useNotificationRules, useScheduledNotifications, useSendNotification, useToggleNotificationRule,
  type RuleCondition,
} from '../../api/content'
import { useMembers } from '../../api/hooks'
import { useDebounce, useNow } from '../../lib/hooks'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Icon, IconButton, SectionHeader, SelectField, Skeleton, Tabs, TextArea, useToast, cn } from '../../components/ui'

const KINDS = ['Annonce', 'Rappel', 'Offre']
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
const CONDITIONS: { key: RuleCondition; label: string; sub: string }[] = [
  { key: 'NONE', label: 'Aucune condition', sub: 'Envoyer à tout le groupe' },
  { key: 'EXPIRES_7D', label: 'Expire dans 7 jours', sub: 'Abonnement proche de l’échéance' },
  { key: 'ABSENT_14D', label: 'Absent depuis 14 jours', sub: 'Aucune séance depuis 2 semaines' },
  { key: 'CLASS_TOMORROW', label: 'Cours demain', sub: 'Inscrit à un cours demain' },
]
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function dayText(days: number[]) {
  if (days.length === 7) return 'Tous les jours'
  if (days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d))) return 'Du lundi au vendredi'
  if (days.length === 2 && days.includes(5) && days.includes(6)) return 'Le week-end'
  return [...days].sort().map((d) => DAY_NAMES[d]).join(', ') || 'Aucun jour'
}

function Compose() {
  const toast = useToast()
  const { data: aud } = useAudiences()
  const send = useSendNotification()
  const [kind, setKind] = useState('Annonce')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('ALL')
  const [search, setSearch] = useState('')
  const [person, setPerson] = useState<{ id: string; name: string } | null>(null)
  const { members } = useMembers(useDebounce(audience === 'USER' ? search.trim() : '', 300))
  const [later, setLater] = useState(false)
  const [sendAt, setSendAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const audiences = aud?.audiences ?? []
  const target = audience === 'USER' ? (person ? `USER:${person.id}` : '') : audience
  const current = audiences.find((a) => a.key === audience)
  const now = useNow()
  const valid = title.trim() && body.trim() && target && (!later || (sendAt && new Date(sendAt).getTime() > now))

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="space-y-5 p-6 xl:col-span-3">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
        <div className="space-y-2">
          <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Type</div>
          <div className="flex flex-wrap gap-2">{KINDS.map((k) => <button key={k} onClick={() => setKind(k)} className={cn('h-10 rounded-full px-4 text-sm font-bold transition', kind === k ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink hover:bg-primary-border/60')}>{k}</button>)}</div>
        </div>
        <Field label="Titre" icon="title" placeholder="Titre de la notification" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextArea label="Message" icon="notes" placeholder="Votre message" value={body} onChange={(e) => setBody(e.target.value)} />
        <SelectField label="Destinataires" icon="groups" value={audience} onChange={(e) => { setAudience(e.target.value); setPerson(null); setSearch('') }}>
          {audiences.map((a) => <option key={a.key} value={a.key}>{a.label} ({a.count})</option>)}
          <option value="USER">Une personne précise…</option>
        </SelectField>
        {audience === 'USER' ? (
          <div className="space-y-2">
            {person ? (
              <div className="flex items-center justify-between rounded-2xl bg-primary-soft px-4 py-3 text-sm font-bold text-primary-ink">
                {person.name}
                <IconButton icon="close" label="Changer de destinataire" onClick={() => setPerson(null)} />
              </div>
            ) : (
              <>
                <Field label="Rechercher un adhérent" icon="search" placeholder="Nom, e-mail ou téléphone" value={search} onChange={(e) => setSearch(e.target.value)} />
                {search.trim() ? (
                  <div className="overflow-hidden rounded-2xl border border-border">
                    {members.slice(0, 6).map((m) => (
                      <button key={m.id} type="button" onClick={() => setPerson({ id: m.id, name: `${m.firstName} ${m.lastName}` })} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-surface-2">
                        <span className="font-bold">{m.firstName} {m.lastName}</span>
                        <span className="text-xs text-muted">{m.email ?? m.phone ?? ''}</span>
                      </button>
                    ))}
                    {members.length === 0 ? <div className="px-4 py-3 text-sm text-muted">Aucun résultat</div> : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Envoi</div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setLater(false)} className={cn('h-10 rounded-full px-4 text-sm font-bold', !later ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink')}>Maintenant</button>
            <button onClick={() => setLater(true)} className={cn('h-10 rounded-full px-4 text-sm font-bold', later ? 'bg-primary text-white shadow-primary' : 'bg-primary-soft text-primary-ink')}>Programmer</button>
            {later ? <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="h-10 rounded-full border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary" /> : null}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            icon={later ? 'schedule_send' : 'send'}
            disabled={!valid}
            loading={send.isPending}
            onClick={() =>
              send.mutate(
                { kind, title: title.trim(), body: body.trim(), audience: target, sendAt: later ? new Date(sendAt).toISOString() : undefined },
                {
                  onSuccess: () => { toast(later ? `Notification programmée pour le ${when(new Date(sendAt).toISOString())}` : 'Notification envoyée'); setTitle(''); setBody(''); setLater(false); setSendAt(''); setError(null) },
                  onError: (e) => setError(apiErrorMessage(e, "La notification n'a pas pu être envoyée.")),
                },
              )
            }
          >
            {later ? "Programmer l'envoi" : 'Envoyer maintenant'}
          </Button>
        </div>
      </Card>

      <div className="space-y-2 xl:col-span-2">
        <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Aperçu sur le téléphone</div>
        <div className="rounded-3xl bg-secondary p-5 text-white shadow-card">
          <div className="flex items-center gap-2 text-xs text-white/70"><span className="grid size-5 place-items-center rounded-md bg-primary"><Icon name="exercise" size={13} /></span>MuscleUP · {later && sendAt ? when(new Date(sendAt).toISOString()) : 'maintenant'}</div>
          <div className="mt-2 font-head text-base font-bold">{title || 'Titre de la notification'}</div>
          <div className="mt-0.5 text-sm text-white/85">{body || 'Le message apparaîtra ici.'}</div>
          <div className="mt-3 text-xs text-white/60">{audience === 'USER' ? `Sera envoyée à ${person?.name ?? '—'}` : `Sera envoyée à ${current?.count ?? 0} personne${(current?.count ?? 0) > 1 ? 's' : ''} · ${current?.label ?? '—'}`}</div>
        </div>
      </div>
    </div>
  )
}

function Scheduled() {
  const toast = useToast()
  const { data, isLoading } = useScheduledNotifications()
  const cancel = useCancelScheduledNotification()
  const [target, setTarget] = useState<string | null>(null)
  if (isLoading) return <Skeleton className="h-32 rounded-xl" />
  if ((data ?? []).length === 0) return <Card><EmptyState icon="schedule_send" title="Aucun envoi programmé" hint="Les notifications programmées apparaissent ici jusqu’à leur envoi." /></Card>
  return (
    <>
      <Card className="divide-y divide-border overflow-hidden">
        {(data ?? []).map((n) => (
          <div key={n.id} className="flex items-center gap-4 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink"><Icon name="schedule_send" size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{n.title}</div>
              <div className="truncate text-sm text-muted">{n.body}</div>
              <div className="mt-0.5 text-xs text-muted">{when(n.sendAt)} · {n.audience.startsWith('USER:') ? 'Une personne' : n.audience}</div>
            </div>
            <Button size="sm" variant="danger" icon="close" onClick={() => setTarget(n.id)}>Annuler l’envoi</Button>
          </div>
        ))}
      </Card>
      {target ? <ConfirmDialog title="Annuler cet envoi ?" message="La notification programmée ne sera pas envoyée." confirmLabel="Annuler l’envoi" loading={cancel.isPending} onClose={() => setTarget(null)} onConfirm={() => cancel.mutate(target, { onSuccess: () => { toast('Envoi annulé'); setTarget(null) }, onError: (e) => toast(apiErrorMessage(e), 'danger') })} /> : null}
    </>
  )
}

function History() {
  const { data, isLoading } = useNotificationHistory()
  if (isLoading) return <Skeleton className="h-32 rounded-xl" />
  if ((data ?? []).length === 0) return <Card><EmptyState icon="history" title="Aucun envoi" hint="L’historique des notifications envoyées apparaît ici." /></Card>
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {(data ?? []).map((n) => (
        <div key={n.id} className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{n.title}</div>
            <div className="truncate text-sm text-muted">{n.body}</div>
            <div className="mt-0.5 text-xs text-muted">{n.sentAt ? when(n.sentAt) : when(n.sendAt)} · {n.audience.startsWith('USER:') ? 'Une personne' : n.audience}</div>
          </div>
          <div className="text-right text-xs"><div className="font-bold">{n.sentCount} envoi{n.sentCount > 1 ? 's' : ''}</div><div className="font-bold text-success-ink">{n.openRate} % ouvertes</div></div>
        </div>
      ))}
    </Card>
  )
}

function Rules() {
  const toast = useToast()
  const { data: aud } = useAudiences()
  const { data, isLoading } = useNotificationRules()
  const create = useCreateNotificationRule()
  const toggle = useToggleNotificationRule()
  const remove = useDeleteNotificationRule()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('ALL')
  const [condition, setCondition] = useState<RuleCondition>('NONE')
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [time, setTime] = useState('09:00')
  const audiences = aud?.audiences ?? []
  const label = (key: string) => audiences.find((a) => a.key === key)?.label ?? key

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" icon={open ? 'close' : 'add'} variant={open ? 'outline' : 'primary'} onClick={() => setOpen((o) => !o)}>{open ? 'Fermer' : 'Nouvelle règle'}</Button></div>
      {open ? (
        <Card className="space-y-5 p-6">
          <Field label="Titre" icon="title" placeholder="Ex. Votre abonnement expire bientôt" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea label="Message" icon="notes" value={body} onChange={(e) => setBody(e.target.value)} />
          <SelectField label="Destinataires" icon="groups" value={audience} onChange={(e) => setAudience(e.target.value)}>{audiences.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</SelectField>
          <div className="space-y-2">
            <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Condition d’envoi</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONDITIONS.map((c) => (
                <button key={c.key} onClick={() => setCondition(c.key)} className={cn('rounded-2xl border-[1.5px] p-3.5 text-left transition', condition === c.key ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary-border')}>
                  <div className="text-sm font-bold">{c.label}</div><div className="text-[13px] text-muted">{c.sub}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <div className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-muted">Jours d’envoi</div>
              <div className="flex gap-1.5">{DAYS.map((d, i) => <button key={i} aria-label={DAY_NAMES[i]} onClick={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))} className={cn('size-10 rounded-full text-sm font-bold transition', days.includes(i) ? 'bg-primary text-white' : 'bg-primary-soft text-primary-ink')}>{d}</button>)}</div>
            </div>
            <Field label="Heure d’envoi" icon="schedule" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-48" />
          </div>
          <div className="flex justify-end">
            <Button icon="check" disabled={!title.trim() || !body.trim() || days.length === 0} loading={create.isPending}
              onClick={() => create.mutate({ title: title.trim(), body: body.trim(), audience, condition, days, time }, { onSuccess: () => { toast('Règle créée'); setOpen(false); setTitle(''); setBody('') }, onError: (e) => toast(apiErrorMessage(e), 'danger') })}>
              Créer la règle
            </Button>
          </div>
        </Card>
      ) : null}
      {isLoading ? <Skeleton className="h-32 rounded-xl" /> : (data ?? []).length === 0 && !open ? (
        <Card><EmptyState icon="repeat" title="Aucune règle" hint="Automatisez vos rappels : expiration proche, absence prolongée, cours du lendemain…" /></Card>
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {(data ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{r.title}</span><Badge tone={r.isActive ? 'success' : 'muted'} dot>{r.isActive ? 'Active' : 'En pause'}</Badge></div>
                <div className="mt-0.5 text-sm text-muted">{dayText(r.days)} à {r.time} · {label(r.audience)}{r.condition !== 'NONE' ? ` · ${CONDITIONS.find((c) => c.key === r.condition)?.label}` : ''}</div>
              </div>
              <IconButton icon={r.isActive ? 'pause_circle' : 'play_circle'} label={r.isActive ? 'Mettre en pause' : 'Activer'} onClick={() => toggle.mutate({ id: r.id, isActive: !r.isActive })} />
              <IconButton icon="delete" label="Supprimer la règle" className="text-danger-ink hover:bg-danger-soft" onClick={() => remove.mutate(r.id, { onSuccess: () => toast('Règle supprimée') })} />
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

/** Notifications push : composer, programmer, historique, règles récurrentes. */
export function NotificationsTab() {
  const { data: scheduled } = useScheduledNotifications()
  const [seg, setSeg] = useState<'compose' | 'scheduled' | 'history' | 'rules'>('compose')
  return (
    <div className="space-y-5">
      <SectionHeader title="Notifications push" icon="notifications" />
      <Tabs value={seg} onChange={setSeg} options={[{ value: 'compose', label: 'Composer' }, { value: 'scheduled', label: 'Programmées', count: scheduled?.length ?? 0 }, { value: 'history', label: 'Historique' }, { value: 'rules', label: 'Règles récurrentes' }]} />
      {seg === 'compose' ? <Compose /> : seg === 'scheduled' ? <Scheduled /> : seg === 'history' ? <History /> : <Rules />}
    </div>
  )
}
