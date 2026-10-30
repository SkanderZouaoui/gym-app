import type { ProgramStatus } from '../../hooks/useCoachSessions';
import i18n from '../../i18n';

/** Libellé court et libellé de pastille d'un statut de validation de programme. */
export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  get APPROVED() { return i18n.t('common.valide'); },
  get PENDING() { return i18n.t('common.en_validation'); },
  get REJECTED() { return i18n.t('common.refuse'); },
};

/** Durée estimée d'un programme à partir de son nombre de séries (≈ 3,2 min par série). */
export function estimateMinutes(totalSets: number): number {
  return Math.round(totalSets * 3.2);
}
