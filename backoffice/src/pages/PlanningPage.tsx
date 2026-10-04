import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classesApi } from '../api/endpoints'
import { useSessionStore } from '../store/session'

export function PlanningPage() {
  const activeBranchId = useSessionStore((s) => s.activeBranchId)
  const queryClient = useQueryClient()

  const { data: sessions } = useQuery({
    queryKey: ['classes', 'sessions', activeBranchId],
    queryFn: () => classesApi.findSessions(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const cancelSession = useMutation({
    mutationFn: (id: string) => classesApi.cancelSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes', 'sessions'] }),
  })

  const handleCancel = (id: string, name: string) => {
    if (confirm(`Annuler le cours "${name}" ? Les inscrits seront notifiés.`)) {
      cancelSession.mutate(id)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Planning</h1>
        <p className="text-sm text-(--color-muted)">Séances du site sélectionné</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
              <th className="px-4 py-3">Cours</th>
              <th className="px-4 py-3">Horaire</th>
              <th className="px-4 py-3">Coach</th>
              <th className="px-4 py-3">Remplissage</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(sessions ?? []).map((s) => (
              <tr key={s.id} className="border-b border-(--color-border) last:border-0">
                <td className="px-4 py-3 font-semibold">{s.classType.name}</td>
                <td className="px-4 py-3 text-(--color-muted)">
                  {new Date(s.startsAt).toLocaleString('fr-FR', {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3 text-(--color-muted)">
                  {s.coach ? `${s.coach.user.firstName} ${s.coach.user.lastName}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {s._count.bookings}/{s.capacity}
                </td>
                <td className="px-4 py-3 text-right">
                  {s.status !== 'CANCELLED' ? (
                    <button
                      onClick={() => handleCancel(s.id, s.classType.name)}
                      className="rounded-md border border-(--color-border-strong) px-3 py-1.5 text-xs font-bold hover:bg-(--color-danger-soft) hover:text-(--color-danger-ink)"
                    >
                      Annuler
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-(--color-danger-ink)">Annulé</span>
                  )}
                </td>
              </tr>
            ))}
            {!sessions || sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-(--color-muted)">
                  Aucun cours programmé.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
