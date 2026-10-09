import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  branchId: string | null;
  planId: string | null;
  sentAt: string | null;
  createdAt: string;
}

/** Annonces reçues par l'adhérent courant (ciblées par site/formule). */
export function useMyAnnouncements() {
  return useQuery({
    queryKey: ['me', 'announcements'],
    queryFn: () => apiRequest<Announcement[]>('/v1/me/announcements'),
  });
}
