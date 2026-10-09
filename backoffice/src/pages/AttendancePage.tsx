import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '../api/endpoints'

const REASON_LABELS: Record<string, string> = {
  OK: 'Présence confirmée',
  TOKEN_INVALID: 'QR invalide',
  TOKEN_EXPIRED: 'QR expiré',
  TOKEN_REPLAYED: 'QR déjà utilisé',
  NO_BOOKING: 'Aucune réservation',
  BOOKING_WAITLISTED: "En liste d'attente",
  BOOKING_CANCELLED: 'Réservation annulée',
  ALREADY_CHECKED_IN: 'Déjà présent',
  MEMBERSHIP_EXPIRED: 'Abonnement expiré',
  MEMBERSHIP_SUSPENDED: 'Abonnement suspendu',
  OUTSIDE_WINDOW: 'Hors fenêtre de scan',
}

export function AttendancePage() {
  const { data: logs } = useQuery({
    queryKey: ['attendance', 'logs'],
    queryFn: attendanceApi.getLogs,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-head text-2xl font-extrabold text-(--color-secondary)">Présences</h1>
        <p className="text-sm text-(--color-muted)">Journal des scans acceptés et refusés</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
              <th className="px-4 py-3">Adhérent</th>
              <th className="px-4 py-3">Cours</th>
              <th className="px-4 py-3">Résultat</th>
              <th className="px-4 py-3">Motif</th>
              <th className="px-4 py-3">Horodatage</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-(--color-border) last:border-0">
                <td className="px-4 py-3 font-semibold">
                  {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                </td>
                <td className="px-4 py-3 text-(--color-muted)">{log.session.classType.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      log.result === 'GRANTED'
                        ? 'bg-(--color-success-soft) text-(--color-success-ink)'
                        : 'bg-(--color-danger-soft) text-(--color-danger-ink)'
                    }`}
                  >
                    {log.result === 'GRANTED' ? 'Accepté' : 'Refusé'}
                  </span>
                </td>
                <td className="px-4 py-3 text-(--color-muted)">
                  {REASON_LABELS[log.reasonCode] ?? log.reasonCode}
                </td>
                <td className="px-4 py-3 text-(--color-muted)">
                  {new Date(log.scannedAt).toLocaleString('fr-FR')}
                </td>
              </tr>
            ))}
            {!logs || logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-(--color-muted)">
                  Aucun scan enregistré.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
