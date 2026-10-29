import type { ProgramStatus } from '../../hooks/useCoachSessions';

/** Libellé court et libellé de pastille d'un statut de validation de programme. */
export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  APPROVED: 'Validé',
  PENDING: 'En validation',
  REJECTED: 'Refusé',
};

/** Durée estimée d'un programme à partir de son nombre de séries (≈ 3,2 min par série). */
export function estimateMinutes(totalSets: number): number {
  return Math.round(totalSets * 3.2);
}
