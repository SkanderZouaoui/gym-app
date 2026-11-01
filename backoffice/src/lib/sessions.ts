import type { Tone } from '../components/ui/Badge'
import type { SessionSummary } from '../api/types'

export type SessionStateKey = 'done' | 'live' | 'cancelled' | 'full' | 'almost' | 'open'

/** État d'un cours — mêmes règles que le planning mobile : terminé, en cours, annulé, complet, presque plein, places disponibles. */
export function sessionState(s: Pick<SessionSummary, 'startsAt' | 'endsAt' | 'status' | 'capacity' | '_count'>, now: number): { key: SessionStateKey; label: string; tone: Tone; ratio: number } {
  const start = new Date(s.startsAt).getTime()
  const end = new Date(s.endsAt).getTime()
  const ratio = s._count.bookings / Math.max(1, s.capacity)
  if (s.status === 'CANCELLED') return { key: 'cancelled', label: 'Annulé', tone: 'danger', ratio }
  if (end < now) return { key: 'done', label: 'Terminé', tone: 'muted', ratio }
  if (start <= now) return { key: 'live', label: 'En cours', tone: 'success', ratio }
  if (ratio >= 1) return { key: 'full', label: 'Complet', tone: 'danger', ratio }
  if (ratio >= 0.7) return { key: 'almost', label: 'Presque plein', tone: 'warning', ratio }
  return { key: 'open', label: 'Places disponibles', tone: 'muted', ratio }
}

export const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
