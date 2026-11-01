export interface Shift {
  dayOfWeek: number; // 0 = lundi
  working: boolean;
  startTime: string; // « HH:MM »
  endTime: string;
}

export type ShiftStatus =
  | { kind: 'off' }
  | { kind: 'before'; startsAt: string }
  | { kind: 'on'; endsAt: string }
  | { kind: 'done' };

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Index de jour du planning (lundi = 0) pour une date. */
export const shiftDayIndex = (date: Date): number => (date.getDay() + 6) % 7;

/** Où en est la journée de travail à cet instant : repos, pas encore commencée, en poste ou terminée. */
export function shiftStatus(day: Shift | undefined, now: Date): ShiftStatus {
  if (!day?.working || minutes(day.endTime) <= minutes(day.startTime)) return { kind: 'off' };
  const m = now.getHours() * 60 + now.getMinutes();
  if (m < minutes(day.startTime)) return { kind: 'before', startsAt: day.startTime };
  if (m < minutes(day.endTime)) return { kind: 'on', endsAt: day.endTime };
  return { kind: 'done' };
}

/** Fenêtre de la frise hebdomadaire : de 06:00 à minuit. */
export const BAR_START = 6 * 60;
export const BAR_END = 24 * 60;

/** Position du créneau sur la frise, en fractions (0–1) de la fenêtre ; null pour un jour de repos. */
export function shiftBar(day: Shift | undefined): { from: number; to: number } | null {
  if (!day?.working || minutes(day.endTime) <= minutes(day.startTime)) return null;
  const clamp = (n: number) => Math.min(1, Math.max(0, (n - BAR_START) / (BAR_END - BAR_START)));
  return { from: clamp(minutes(day.startTime)), to: clamp(minutes(day.endTime)) };
}

/** Total d'heures de la semaine, arrondi au dixième. */
export function weekHours(days: Shift[]): number {
  const total = days.reduce((n, d) => (d.working && minutes(d.endTime) > minutes(d.startTime) ? n + (minutes(d.endTime) - minutes(d.startTime)) / 60 : n), 0);
  return Math.round(total * 10) / 10;
}
