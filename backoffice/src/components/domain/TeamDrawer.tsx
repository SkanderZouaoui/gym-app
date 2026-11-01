import { useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { resetTeamPassword, shiftHours, useDeleteTeamMember, useSaveWorkSchedule, useTeamStats, useUpdateTeamMember, useWorkSchedule, type TeamMember, type WorkDay } from '../../api/admin'
import { formatDate, formatMoney } from '../../lib/format'
import { Avatar, Badge, Button, Card, ConfirmDialog, Drawer, Field, Icon, SectionHeader, Skeleton, Tabs, useToast, cn } from '../ui'

import { ROLE_LABEL } from '../../lib/roles'
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-h-14 flex-1 items-center gap-2.5 rounded-2xl border-[1.5px] border-primary-border bg-surface px-3 focus-within:border-primary">
      <Icon name="schedule" size={20} className="text-primary-ink" />
      <span className="flex flex-col">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{label}</span>
        <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-head text-lg font-bold outline-none" />
      </span>
    </label>
  )
}

/** Planning de travail hebdomadaire — chaque jour a un début et une fin clairement étiquetés (comme sur le mobile). */
function ScheduleEditor({ member }: { member: TeamMember }) {
  const toast = useToast()
  const { data, isLoading } = useWorkSchedule(member.id)
  const save = useSaveWorkSchedule()
  const [draft, setDraft] = useState<WorkDay[] | null>(null)
  const days = draft ?? data ?? []
  const set = (d: number, patch: Partial<WorkDay>) => setDraft(days.map((x) => (x.dayOfWeek === d ? { ...x, ...patch } : x)))
  const total = Math.round(days.reduce((n, d) => n + shiftHours(d), 0) * 10) / 10

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Semaine type, répétée chaque semaine.</p>
        <Badge tone="primary">{total} h / semaine</Badge>
      </div>
      {days.map((d) => (
        <div key={d.dayOfWeek} className={cn('space-y-3 rounded-2xl border p-3.5', d.working ? 'border-primary-border bg-surface' : 'border-border bg-surface')}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-head text-base font-bold">{DAY_NAMES[d.dayOfWeek]}</div>
              <div className={cn('text-[13px]', d.working ? 'font-semibold text-success-ink' : 'text-muted')}>{d.working ? `${d.startTime} → ${d.endTime} · ${shiftHours(d)} h` : 'Repos'}</div>
            </div>
            <button
              role="switch"
              aria-checked={d.working}
              aria-label={`Travaille le ${DAY_NAMES[d.dayOfWeek].toLowerCase()}`}
              onClick={() => set(d.dayOfWeek, { working: !d.working })}
              className={cn('relative h-7 w-12 rounded-full transition', d.working ? 'bg-primary' : 'bg-border-strong')}
            >
              <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', d.working ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>
          {d.working ? (
            <div className="flex items-center gap-2">
              <TimeInput label="Début" value={d.startTime} onChange={(v) => set(d.dayOfWeek, { startTime: v })} />
              <Icon name="arrow_forward" size={18} className="text-muted" />
              <TimeInput label="Fin" value={d.endTime} onChange={(v) => set(d.dayOfWeek, { endTime: v })} />
            </div>
          ) : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="soft" size="sm" icon="content_copy" onClick={() => setDraft(days.map((x) => (x.dayOfWeek >= 1 && x.dayOfWeek <= 4 ? { ...days[0], dayOfWeek: x.dayOfWeek } : x)))}>
          Copier le lundi sur mardi–vendredi
        </Button>
        <Button
          className="ml-auto"
          icon="check"
          disabled={!draft}
          loading={save.isPending}
          onClick={() =>
            draft &&
            save.mutate(
              { id: member.id, days: draft },
              {
                onSuccess: () => {
                  setDraft(null)
                  toast('Planning enregistré')
                },
                onError: (e) => toast(apiErrorMessage(e, "L'heure de fin doit être après l'heure de début."), 'danger'),
              },
            )
          }
        >
          Enregistrer le planning
        </Button>
      </div>
    </div>
  )
}

function Stats({ member }: { member: TeamMember }) {
  const [days, setDays] = useState<'7' | '30'>('30')
  const { data, isLoading } = useTeamStats(member.id, Number(days))
  const tiles: [string, string][] = []
  if (data?.staff) {
    const s = data.staff
    tiles.push(['Encaissements', `${s.payments} · ${formatMoney(s.paymentsTotal)}`], ['Comptes créés', String(s.accountsCreated)], ['Pointages', `${s.scansGranted} / ${s.scans}`], ['Jours travaillés', String(s.daysWorked)], ['Heures', `${s.hours} h`], ['Moyenne', `${s.avgHoursPerDay} h / jour`])
  }
  if (data?.coach) {
    const c = data.coach
    tiles.push(['Cours donnés', String(c.sessions)], ['Participants', String(c.attendees)], ['À venir', String(c.upcoming)], ['Jours travaillés', String(c.daysWorked)], ['Heures', `${c.hours} h`], ['Moyenne', `${c.avgHoursPerDay} h / jour`])
  }
  return (
    <div className="space-y-3">
      <Tabs value={days} onChange={setDays} options={[{ value: '7', label: '7 jours' }, { value: '30', label: '30 jours' }]} />
      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : tiles.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Pas encore d’activité sur cette période.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {tiles.map(([k, v]) => (
            <Card key={k} className="p-4">
              <div className="font-head text-lg font-extrabold">{v}</div>
              <div className="text-xs font-semibold text-muted">{k}</div>
            </Card>
          ))}
        </div>
      )}
      {data && (data.staff?.estimated || data.coach?.estimated) ? <p className="text-xs text-muted">Estimation à partir de l’activité : aucun planning de travail défini.</p> : null}
    </div>
  )
}

/** Fiche d'un membre de l'équipe : identité, état du compte, planning de travail, activité. */
export function TeamDrawer({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdateTeamMember()
  const remove = useDeleteTeamMember()
  const [tab, setTab] = useState<'info' | 'schedule' | 'stats'>('info')
  const [firstName, setFirstName] = useState(member.firstName)
  const [lastName, setLastName] = useState(member.lastName)
  const [phone, setPhone] = useState(member.phone ?? '')
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const dirty = firstName !== member.firstName || lastName !== member.lastName || phone !== (member.phone ?? '')
  const suspended = member.status === 'SUSPENDED'
  const roles = member.roles.map((r) => ROLE_LABEL[r.role] ?? r.role)

  return (
    <>
      <Drawer title={`${member.firstName} ${member.lastName}`} subtitle={roles.join(' · ')} onClose={onClose} width="max-w-xl">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar firstName={member.firstName} lastName={member.lastName} photoUrl={member.photoUrl} size={64} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-muted">{member.email}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {roles.map((r) => <Badge key={r} tone="primary">{r}</Badge>)}
                <Badge tone={suspended ? 'warning' : 'success'} dot>{suspended ? 'Suspendu' : 'Actif'}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted">Compte créé le {formatDate(member.createdAt)}</div>
            </div>
          </div>

          <Tabs value={tab} onChange={setTab} options={[{ value: 'info', label: 'Informations' }, { value: 'schedule', label: 'Planning de travail' }, { value: 'stats', label: 'Activité' }]} />

          {tab === 'info' ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" icon="person" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Field label="Nom" icon="badge" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <Field label="Téléphone" icon="call" inputMode="tel" placeholder="22 222 222" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Field label="E-mail" icon="mail" value={member.email ?? ''} readOnly />
              <Button
                icon="check"
                className="w-full"
                disabled={!dirty || !firstName.trim() || !lastName.trim()}
                loading={update.isPending && !update.variables?.status}
                onClick={() =>
                  update.mutate(
                    { id: member.id, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() },
                    { onSuccess: () => toast('Informations enregistrées'), onError: (e) => toast(apiErrorMessage(e), 'danger') },
                  )
                }
              >
                Enregistrer
              </Button>

              {tempPassword ? (
                <div className="rounded-2xl bg-warning-soft p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-warning-ink">Nouveau mot de passe provisoire</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 font-head text-xl font-bold tracking-widest">{tempPassword}</code>
                    <Button size="sm" variant="outline" icon="content_copy" onClick={async () => { await navigator.clipboard.writeText(tempPassword); toast('Copié') }}>Copier</Button>
                  </div>
                  <p className="mt-2 text-[13px] text-warning-ink">À transmettre à la personne : il ne sera plus affiché.</p>
                </div>
              ) : null}

              <section className="space-y-2.5 border-t border-border pt-5">
                <SectionHeader title="Compte" icon="manage_accounts" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    icon={suspended ? 'play_circle' : 'pause_circle'}
                    loading={update.isPending && !!update.variables?.status}
                    onClick={() =>
                      update.mutate(
                        { id: member.id, status: suspended ? 'ACTIVE' : 'SUSPENDED' },
                        { onSuccess: () => toast(suspended ? 'Compte réactivé' : 'Compte suspendu'), onError: (e) => toast(apiErrorMessage(e), 'danger') },
                      )
                    }
                  >
                    {suspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                  </Button>
                  <Button variant="outline" icon="lock_reset" onClick={() => setConfirm('reset')}>Réinitialiser le mot de passe</Button>
                  <Button variant="danger" icon="delete" onClick={() => setConfirm('delete')}>Supprimer</Button>
                </div>
              </section>
            </div>
          ) : tab === 'schedule' ? (
            <ScheduleEditor member={member} />
          ) : (
            <Stats member={member} />
          )}
        </div>
      </Drawer>

      {confirm === 'reset' ? (
        <ConfirmDialog
          title="Réinitialiser le mot de passe ?"
          message={`Un nouveau mot de passe provisoire sera généré pour ${member.firstName} ${member.lastName}. L’ancien ne fonctionnera plus.`}
          confirmLabel="Réinitialiser"
          loading={resetting}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            setResetting(true)
            try {
              setTempPassword((await resetTeamPassword(member.id)).password)
              setConfirm(null)
            } catch (e) {
              toast(apiErrorMessage(e), 'danger')
            } finally {
              setResetting(false)
            }
          }}
        />
      ) : null}
      {confirm === 'delete' ? (
        <ConfirmDialog
          danger
          title="Supprimer ce compte ?"
          message={`Le compte de ${member.firstName} ${member.lastName} sera supprimé définitivement.`}
          confirmLabel="Supprimer"
          loading={remove.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            remove.mutate(member.id, {
              onSuccess: () => {
                toast('Compte supprimé')
                onClose()
              },
              onError: (e) => {
                toast(apiErrorMessage(e), 'danger')
                setConfirm(null)
              },
            })
          }
        />
      ) : null}
    </>
  )
}
