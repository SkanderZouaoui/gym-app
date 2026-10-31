import type { ClassSessionSummary } from '../../api/types';
import i18n from '../../i18n';

/** État d'un cours dans le planning : terminé, en cours, annulé, complet, presque plein ou places disponibles. */
export function sessionState(s: ClassSessionSummary, now: number) {
  const start = new Date(s.startsAt).getTime();
  const end = new Date(s.endsAt).getTime();
  const ratio = s._count.bookings / Math.max(1, s.capacity);
  if (s.status === 'CANCELLED') return { key: 'cancelled' as const, label: i18n.t('admin.annule'), tone: 'danger' as const, ratio };
  if (end < now) return { key: 'done' as const, label: i18n.t('common.termine'), tone: 'muted' as const, ratio };
  if (start <= now) return { key: 'live' as const, label: i18n.t('common.en_cours'), tone: 'success' as const, ratio };
  if (ratio >= 1) return { key: 'full' as const, label: i18n.t('common.complet'), tone: 'danger' as const, ratio };
  if (ratio >= 0.7) return { key: 'almost' as const, label: i18n.t('common.presque_plein'), tone: 'warning' as const, ratio };
  return { key: 'open' as const, label: i18n.t('staff.places_disponibles'), tone: 'muted' as const, ratio };
}
