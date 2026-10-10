import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role } from '@muscleup/shared'
import { permissionsApi } from '../api/endpoints'

const ROLE_LABELS: Record<Role, string> = {
  MEMBER: 'Adhérent',
  COACH: 'Coach',
  STAFF: 'Accueil',
  ADMIN: 'Admin',
}

const PERMISSION_LABELS: Record<string, string> = {
  'classes.viewPlanning': 'Voir le planning',
  'classes.book': 'Réserver une séance',
  'attendance.manage': 'Gérer les présences',
  'attendance.scanQr': 'Scanner les QR',
  'payments.record': 'Saisir un paiement',
  'classes.cancel': 'Annuler un cours',
  'members.suspend': 'Suspendre un adhérent',
  'appConfig.edit': "Modifier le contenu de l'app",
  'appConfig.publish': 'Publier une version',
  'stats.financial': 'Rapports financiers',
}

const VISIBLE_ROLES: Role[] = ['MEMBER', 'COACH', 'STAFF']

export function RolesPage() {
  const queryClient = useQueryClient()
  const { data: rows } = useQuery({ queryKey: ['permissions'], queryFn: permissionsApi.findAll })

  const setPermission = useMutation({
    mutationFn: ({ permission, role, allowed }: { permission: string; role: Role; allowed: boolean }) =>
      permissionsApi.set(permission, role, allowed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissions'] }),
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Rôles &amp; permissions</h1>
        <p className="text-sm text-(--color-muted)">
          Ce que chaque rôle peut voir et faire dans l’app. Le rôle Admin a toujours accès à tout.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[1.6fr_repeat(4,1fr)] gap-2 bg-(--color-surface-2) px-5 py-3 text-xs font-bold uppercase tracking-wide text-(--color-muted)">
            <span>Permission</span>
            {VISIBLE_ROLES.map((r) => (
              <span key={r} className="text-center">
                {ROLE_LABELS[r]}
              </span>
            ))}
            <span className="text-center">{ROLE_LABELS.ADMIN}</span>
          </div>
          {(rows ?? []).map((row) => (
            <div key={row.permission} className="grid grid-cols-[1.6fr_repeat(4,1fr)] items-center gap-2 border-b border-(--color-border) px-5 py-2 last:border-0">
              <span className="text-[13.5px] font-semibold">{PERMISSION_LABELS[row.permission] ?? row.permission}</span>
              {VISIBLE_ROLES.map((role) => {
                const cell = row.roles.find((r) => r.role === role)
                const allowed = cell?.allowed ?? false
                return (
                  <div key={role} className="grid place-items-center">
                    <button
                      onClick={() => setPermission.mutate({ permission: row.permission, role, allowed: !allowed })}
                      aria-label={`${PERMISSION_LABELS[row.permission] ?? row.permission} · ${ROLE_LABELS[role]}`}
                      className={`grid h-7 w-7 place-items-center rounded-md border-[1.5px] ${
                        allowed
                          ? 'border-(--color-primary) bg-(--color-primary) text-(--color-primary-contrast)'
                          : 'border-(--color-border-strong) bg-transparent text-transparent'
                      }`}
                    >
                      <span className="material-symbols-rounded text-[18px]">check</span>
                    </button>
                  </div>
                )
              })}
              <div className="grid place-items-center">
                <button
                  disabled
                  className="grid h-7 w-7 place-items-center rounded-md border-[1.5px] border-(--color-primary) bg-(--color-primary) text-(--color-primary-contrast) opacity-55"
                >
                  <span className="material-symbols-rounded text-[18px]">check</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
