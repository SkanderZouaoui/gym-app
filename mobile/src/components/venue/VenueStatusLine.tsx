import { useVenue } from '../../hooks/useVenue';
import { VenueStatusBadge } from './VenueStatusBadge';

/** Pastille d'état de la salle seule (« Ouvert jusqu'à 22:00 »), pour les écrans où le nom n'est pas nécessaire. */
export function VenueStatusLine() {
  const { data: venue } = useVenue();
  return venue ? <VenueStatusBadge hours={venue.hours} /> : null;
}
