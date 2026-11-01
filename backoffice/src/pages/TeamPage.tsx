import { useMemo, useState } from 'react'
import { apiErrorCode, apiErrorMessage } from '../api/client'
import { useCreateTeamMember, useTeam, type TeamMember } from '../api/admin'
import { generatePassword } from '../lib/membership'
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Icon, Modal, PageHeader, SearchInput, Skeleton, Tabs, useToast, cn } from '../components/ui'
import { TeamDrawer } from '../components/domain/TeamDrawer'
import { ROLE_LABEL } from '../lib/roles'

type Filter = 'all' | 'STAFF' | 'COACH' | 'ADMIN'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function CreateModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const create = useCreateTeamMember()
  const [role, setRole] = useState<'STAFF' | 'COACH'>('STAFF')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null)
  const [password] = useState(() => generatePassword())
  const valid = firstName.trim() && lastName.trim() && EMAIL.test(email.trim())

  if (created) {
    return (
      <Modal title="Compte créé" onClose={onClose} footer={<Button onClick={onClose}>Terminé</Button>}>
        <div className="space-y-4">
          <p className="text-sm text-muted">Transmettez ces identifiants à <b className="text-text">{created.name}</b>. Le mot de passe est provisoire et ne sera plus affiché.</p>
          <div className="divide-y divide-border rounded-2xl border border-border">
            {[['E-mail', created.email], ['Mot de passe provisoire', created.password]].map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</div>
                  <div className="truncate font-head text-lg font-bold">{v}</div>
                </div>
                <button onClick={async () => { await navigator.clipboard.writeText(v); toast('Copié') }} aria-label={`Copier ${k}`} className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary-ink hover:bg-primary-border/60"><Icon name="content_copy" size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Nouveau membre de l’équipe"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            icon="person_add"
            disabled={!valid}
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || undefined, role },
                {
                  onSuccess: () => setCreated({ name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim(), password }),
                  onError: (e) => setError(apiErrorCode(e) === 'EMAIL_TAKEN' ? 'Cette adresse e-mail est déjà utilisée.' : apiErrorMessage(e, 'Impossible de créer le compte.')),
                },
              )
            }
          >
            Créer le compte
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error ? <div role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">{error}</div> : null}
        <div className="grid grid-cols-2 gap-3">
          {(['STAFF', 'COACH'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={cn('flex items-center gap-3 rounded-2xl border-[1.5px] p-4 text-left transition', role === r ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary-border')}>
              <span className={cn('grid size-10 place-items-center rounded-xl', role === r ? 'bg-gradient-to-br from-primary to-primary-pressed text-white' : 'bg-surface-2 text-primary-ink')}><Icon name={r === 'STAFF' ? 'badge' : 'sports'} size={22} /></span>
              <span><span className="block font-bold">{ROLE_LABEL[r]}</span><span className="block text-xs text-muted">{r === 'STAFF' ? 'Caisse, adhérents, pointage' : 'Cours et programmes'}</span></span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" icon="person" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
          <Field label="Nom" icon="badge" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Field label="E-mail" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={email.length > 3 && !EMAIL.test(email.trim()) ? 'Adresse invalide' : undefined} />
        <Field label="Téléphone" icon="call" inputMode="tel" placeholder="22 222 222" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
    </Modal>
  )
}

export function TeamPage() {
  const { data, isLoading, isError, refetch } = useTeam()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const team = useMemo(() => data ?? [], [data])
  const open = team.find((m) => m.id === openId) ?? null

  const roleOf = (m: TeamMember) => m.roles.map((r) => r.role)
  const counts = { all: team.length, STAFF: team.filter((m) => roleOf(m).includes('STAFF')).length, COACH: team.filter((m) => roleOf(m).includes('COACH')).length, ADMIN: team.filter((m) => roleOf(m).includes('ADMIN')).length }
  const q = query.trim().toLowerCase()
  const shown = team.filter((m) => (filter === 'all' || roleOf(m).includes(filter)) && (!q || `${m.firstName} ${m.lastName} ${m.email ?? ''}`.toLowerCase().includes(q)))

  return (
    <div className="space-y-6">
      <PageHeader title="Équipe" subtitle="Accueil, coachs et administrateurs de la salle." actions={<Button icon="person_add" onClick={() => setCreating(true)}>Nouveau membre</Button>} />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un membre de l’équipe…" />
        <Tabs value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tous', count: counts.all }, { value: 'STAFF', label: 'Accueil', count: counts.STAFF }, { value: 'COACH', label: 'Coachs', count: counts.COACH }, { value: 'ADMIN', label: 'Admins', count: counts.ADMIN }]} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : isError ? (
        <Card><ErrorState onRetry={() => void refetch()} /></Card>
      ) : shown.length === 0 ? (
        <Card><EmptyState icon="group_off" title="Aucun membre" hint="Aucun membre de l’équipe ne correspond à cette recherche." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((m) => (
            <button key={m.id} onClick={() => setOpenId(m.id)} className={cn('flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary-border', m.status === 'SUSPENDED' && 'opacity-70')}>
              <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size={52} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-head text-base font-bold">{m.firstName} {m.lastName}</div>
                <div className="truncate text-[13px] text-muted">{m.email}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {roleOf(m).filter((r) => r !== 'MEMBER').map((r) => <Badge key={r} tone="primary">{ROLE_LABEL[r] ?? r}</Badge>)}
                  {m.status === 'SUSPENDED' ? <Badge tone="warning">Suspendu</Badge> : null}
                </div>
              </div>
              <Icon name="chevron_right" size={20} className="text-muted" />
            </button>
          ))}
        </div>
      )}

      {open ? <TeamDrawer key={open.id} member={open} onClose={() => setOpenId(null)} /> : null}
      {creating ? <CreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  )
}
