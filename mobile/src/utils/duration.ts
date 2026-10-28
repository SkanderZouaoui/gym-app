/** Durée exacte d'une séance en secondes (repli sur les minutes pour les anciennes séances). */
export function workoutSeconds(log: { durationSeconds?: number | null; durationMinutes?: number | null }): number | null {
  if (log.durationSeconds != null) return log.durationSeconds;
  if (log.durationMinutes != null) return log.durationMinutes * 60;
  return null;
}

/** « 48:05 » — minutes et secondes (les minutes peuvent dépasser 59). */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** « 48 min 05 s » pour les listes. */
export function formatDurationLabel(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m} min ${String(s).padStart(2, '0')} s` : `${m} min`;
}
