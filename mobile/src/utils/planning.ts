export type Period = 'morning' | 'afternoon' | 'evening';

/** Moment de la journée d'un horaire : matin (avant 12 h), après-midi (avant 18 h), soir. */
export function periodOf(date: Date): Period {
  const h = date.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/** Regroupe des cours déjà triés par heure en matin / après-midi / soir, en gardant l'ordre et en omettant les périodes vides. */
export function groupByPeriod<T extends { startsAt: string }>(items: T[]): { period: Period; items: T[] }[] {
  const groups: { period: Period; items: T[] }[] = [];
  for (const item of items) {
    const period = periodOf(new Date(item.startsAt));
    const last = groups[groups.length - 1];
    if (last?.period === period) last.items.push(item);
    else groups.push({ period, items: [item] });
  }
  return groups;
}

/**
 * Position du repère « Maintenant » dans la liste d'une journée : juste avant le premier cours à venir (ou à la fin si tous
 * sont terminés). `null` quand un cours est en cours — c'est lui qui est mis en avant — ou s'il n'y a aucun cours.
 */
export function nowMarkerIndex(items: { startsAt: string; endsAt: string }[], now: number): number | null {
  if (items.length === 0) return null;
  if (items.some((s) => new Date(s.startsAt).getTime() <= now && now < new Date(s.endsAt).getTime())) return null;
  const next = items.findIndex((s) => new Date(s.startsAt).getTime() > now);
  return next === -1 ? items.length : next;
}

/** Taux de remplissage global (0–100) d'un ensemble de cours ; 0 sans capacité. */
export function fillPercent(items: { capacity: number; booked: number }[]): number {
  const capacity = items.reduce((n, s) => n + s.capacity, 0);
  return capacity > 0 ? Math.round((items.reduce((n, s) => n + s.booked, 0) / capacity) * 100) : 0;
}
