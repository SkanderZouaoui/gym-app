import i18n from '../i18n';
import { WEEKDAYS_LONG_MON } from '../i18n/labels';
import type { VenueStatus } from './openingHours';

/** Phrase d'état affichée dans les badges : « Ouvert jusqu'à 22:00 », « Fermé · rouvre demain à 07:00 »… */
export function venueStatusText(status: VenueStatus): string {
  switch (status.kind) {
    case 'open':
      return i18n.t('venue.open_until', { time: status.closesAt });
    case 'closedAllWeek':
      return i18n.t('venue.closed_all_week');
    case 'closed':
      if (status.daysAhead === 0) return i18n.t('venue.closed_today_later', { time: status.opensAt });
      if (status.daysAhead === 1) return i18n.t('venue.closed_tomorrow', { time: status.opensAt });
      return i18n.t('venue.closed_day', { day: WEEKDAYS_LONG_MON[status.weekday].toLowerCase(), time: status.opensAt });
  }
}
