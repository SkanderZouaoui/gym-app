import i18n from '../i18n';
import type { Gender } from '../hooks/useGender';

type BookingStatus = 'CONFIRMED' | 'WAITLISTED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';

const KEYS: Record<Exclude<BookingStatus, 'WAITLISTED'>, string> = {
  CONFIRMED: 'confirmee',
  ATTENDED: 'presente',
  NO_SHOW: 'absente',
  CANCELLED: 'annulee',
};

/** Statut d'une réservation accordé au genre : « Absent » / « Absente » ; « Absent·e » tant que le genre est inconnu. */
export function bookingStatusLabel(status: BookingStatus, gender: Gender | undefined): string {
  if (status === 'WAITLISTED') return i18n.t('common.liste_dattente');
  const base = KEYS[status];
  return i18n.t(gender === 'male' ? `member.${base}_m` : gender === 'female' ? `member.${base}` : `member.${base}_n`);
}
