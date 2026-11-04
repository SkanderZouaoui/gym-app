import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { resetMemberPassword, useLoginIssues, useSetMemberStatus, useUnlockLogin } from '../api/hooks'
import type { LoginIssue } from '../api/types'
import { useAuth } from '../store/auth'
import { formatDateTime } from '../lib/format'
import { Avatar, Button, Card, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Skeleton, Tabs, useToast } from '../components/ui'
import { CopyRow } from '../components/domain/CreateMemberModal'

type Filter = 'all' | 'locked' | 'failed' | 'disabled'
const REASON: Record<Exclude<Filter, 'all'>, LoginIssue['reason']> = { locked: 'LOCKED', failed: 'FAILED_ATTEMPTS', disabled: 'SUSPENDED' }

const EMPTY: Record<Filter, { title: string; hint: string }> = {
  all: { title: 'Aucun compte bloqué', hint: 'Tous les adhérents peuvent se connecter.' },
  locked: { title: 'Aucun compte bloqué', hint: 'Aucun adhérent n’est bloqué en ce moment.' },
  failed: { title: 'Aucun échec récent', hint: 'Aucune tentative de connexion échouée à signaler.' },
  disabled: { title: 'Aucun compte désactivé', hint: 'Tous les comptes adhérents sont actifs.' },
}

const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Heure courante rafraîchie chaque seconde, pour les comptes à rebours de blocage. */
function useNowEverySecond() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/**
 * Comptes adhérents bloqués (accueil et admin) : bloqués temporairement après trop d'échecs de connexion, avec des
 * échecs récents, ou désactivés. Actions : débloquer pour réessayer, réinitialiser le mot de passe, ouvrir la fiche
 * et — admin seulement — réactiver un compte désactivé.
 */
export function LockedAccountsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const isAdmin = useAuth((s) => s.activeRole === 'ADMIN')
  const now = useNowEverySecond()
  const { data, isLoading, isError, refetch } = useLoginIssues()
  const unlock = useUnlockLogin()
  const setStatus = useSetMemberStatus()
  const [filter, setFilter] = useState<Filter>('all')
  const [resetting, setResetting] = useState<LoginIssue | null>(null)
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const list = useMemo(() => data ?? [], [data])
  const counts = useMemo(
    () => ({
      all: list.length,
      locked: list.filter((i) => i.reason === 'LOCKED').length,
      failed: list.filter((i) => i.reason === 'FAILED_ATTEMPTS').length,
      disabled: list.filter((i) => i.reason === 'SUSPENDED').length,
    }),
    [list],
  )
  const shown = filter === 'all' ? list : list.filter((i) => i.reason === REASON[filter])
  const fail = (e: unknown) => toast(apiErrorMessage(e), 'danger')

  const runReset = async () => {
    if (!resetting) return
    setBusy(true)
    try {
      const { password } = await resetMemberPassword(resetting.id)
      setTempPassword({ name: `${resetting.firstName} ${resetting.lastName}`, password })
      setResetting(null)
    } catch (e) {
      fail(e)
      setResetting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Comptes bloqués" subtitle="Adhérents qui n’arrivent pas à se connecter : débloquer, réinitialiser le mot de passe." />

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tous', count: counts.all },
          { value: 'locked', label: 'Bloqués', count: counts.locked },
          { value: 'failed', label: 'Échecs', count: counts.failed },
          { value: 'disabled', label: 'Désactivés', count: counts.disabled },
        ]}
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-px p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="my-2 h-14" />)}</div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={filter === 'disabled' ? 'person_off' : filter === 'failed' ? 'check_circle' : 'lock_open'}
            title={EMPTY[filter].title}
            hint={EMPTY[filter].hint}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-[11.5px] font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-3">Adhérent</th>
                <th className="px-4 py-3">Statut</th>
                <th className="hidden px-4 py-3 lg:table-cell">Détail</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const seconds = m.lockedUntil ? Math.max(0, Math.ceil((new Date(m.lockedUntil).getTime() - now) / 1000)) : 0
                const locked = m.reason === 'LOCKED' && seconds > 0
                const canUnlock = locked || m.failures > 0 || m.lockCount > 0
                return (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={m.firstName} lastName={m.lastName} size={40} />
                        <div className="min-w-0">
                          <div className="truncate font-bold">{m.firstName} {m.lastName}</div>
                          <div className="max-w-56 truncate text-xs text-muted">{m.email ?? m.phone ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                        <span className={`size-2 rounded-full ${locked ? 'bg-danger' : m.reason === 'SUSPENDED' ? 'bg-muted' : 'bg-warning'}`} />
                        {locked ? <>Bloqué · <span className="tabular-nums">{countdown(seconds)}</span></> : m.reason === 'SUSPENDED' ? 'Compte désactivé' : `${m.failures || m.lockCount} échec${(m.failures || m.lockCount) > 1 ? 's' : ''}`}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">
                      {locked
                        ? `Trop d’échecs de connexion — nouvel essai possible dans ${countdown(seconds)}.`
                        : m.reason === 'SUSPENDED'
                          ? 'Son accès est suspendu.'
                          : m.lastAttemptAt
                            ? `Dernier échec : ${formatDateTime(m.lastAttemptAt)}.`
                            : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canUnlock ? (
                          <Button size="sm" icon="lock_open" loading={unlock.isPending && unlock.variables === m.id} onClick={() => unlock.mutate(m.id, { onSuccess: () => toast('Compte débloqué : il peut se reconnecter'), onError: fail })}>
                            Débloquer
                          </Button>
                        ) : null}
                        {isAdmin && m.reason === 'SUSPENDED' ? (
                          <Button size="sm" variant="outline" icon="how_to_reg" loading={setStatus.isPending && setStatus.variables?.id === m.id} onClick={() => setStatus.mutate({ id: m.id, suspended: false }, { onSuccess: () => { toast('Compte réactivé'); void refetch() }, onError: fail })}>
                            Réactiver
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" icon="key" onClick={() => setResetting(m)}>Mot de passe</Button>
                        <Button size="sm" variant="ghost" icon="open_in_new" onClick={() => navigate(`/members?id=${m.id}`)}>Fiche</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {resetting ? (
        <ConfirmDialog
          title={`Réinitialiser le mot de passe de ${resetting.firstName} ${resetting.lastName} ?`}
          message="Un mot de passe provisoire sera généré et ses sessions ouvertes seront fermées. Il devra le changer à sa prochaine connexion."
          confirmLabel="Oui, réinitialiser"
          danger
          loading={busy}
          onConfirm={() => void runReset()}
          onClose={() => setResetting(null)}
        />
      ) : null}
      {tempPassword ? (
        <Modal title={`Nouveau mot de passe de ${tempPassword.name}`} onClose={() => setTempPassword(null)} width="max-w-md" footer={<Button onClick={() => setTempPassword(null)}>Terminé</Button>}>
          <p className="mb-3 text-sm text-muted">Communiquez-le à la personne : il ne sera plus affiché. Elle devra le remplacer à sa prochaine connexion.</p>
          <div className="rounded-2xl border border-border"><CopyRow label="Mot de passe provisoire" value={tempPassword.password} secret /></div>
        </Modal>
      ) : null}
    </div>
  )
}
