export interface DayHours {
  open: boolean;
  from: string; // « HH:MM »
  to: string;
}

export type VenueStatus =
  | { kind: 'open'; closesAt: string }
  | { kind: 'closed'; opensAt: string; /** 0 = plus tard aujourd'hui, 1 = demain, 2+ = un autre jour */ daysAhead: number; weekday: number }
  | { kind: 'closedAllWeek' };

/** Minutes depuis minuit pour « HH:MM ». */
export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Index de jour des horaires (lundi = 0 … dimanche = 6) pour une date. */
export const weekdayIndex = (date: Date): number => (date.getDay() + 6) % 7;

const isOpenDay = (d: DayHours | undefined): d is DayHours => !!d && d.open && toMinutes(d.to) > toMinutes(d.from);

/**
 * État de la salle à un instant donné d'après ses horaires hebdomadaires (lundi → dimanche) : ouverte (jusqu'à quelle
 * heure) ou fermée (prochaine ouverture). Un créneau dont la fin précède le début est ignoré.
 */
export function venueStatus(hours: DayHours[], now: Date): VenueStatus {
  const today = weekdayIndex(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const t = hours[today];
  if (isOpenDay(t) && minutes >= toMinutes(t.from) && minutes < toMinutes(t.to)) return { kind: 'open', closesAt: t.to };

  for (let ahead = 0; ahead <= 7; ahead++) {
    const idx = (today + ahead) % 7;
    const d = hours[idx];
    if (!isOpenDay(d)) continue;
    if (ahead === 0 && minutes >= toMinutes(d.from)) continue; // le créneau d'aujourd'hui est déjà passé
    return { kind: 'closed', opensAt: d.from, daysAhead: ahead, weekday: idx };
  }
  return { kind: 'closedAllWeek' };
}

/** Durée d'ouverture d'un jour en minutes (0 si fermé ou créneau incohérent). */
export function openMinutes(day: DayHours | undefined): number {
  return isOpenDay(day) ? toMinutes(day.to) - toMinutes(day.from) : 0;
}

/** « 07:00–22:00 » pour la date donnée, ou null si la salle est fermée ce jour-là. */
export function hoursLabel(hours: DayHours[], date: Date): string | null {
  const d = hours[weekdayIndex(date)];
  return isOpenDay(d) ? `${d.from}–${d.to}` : null;
}
