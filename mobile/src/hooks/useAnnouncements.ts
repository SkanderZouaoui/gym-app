import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  planId: string | null;
  tone?: 'info' | 'accent' | 'danger';
  audience?: string;
  sentAt: string | null;
  createdAt: string;
  endsOn?: string | null;
}

/** Annonces reçues par l'adhérent courant (ciblées par site/formule). */
export function useMyAnnouncements() {
  return useQuery({
    queryKey: ['me', 'announcements'],
    queryFn: () => apiRequest<Announcement[]>('/v1/me/announcements'),
  });
}

/** Annonces passées comprises. */
export function useMyAnnouncementsHistory() {
  return useQuery({
    queryKey: ['me', 'announcements', 'history'],
    queryFn: () => apiRequest<Announcement[]>('/v1/me/announcements?history=1'),
  });
}
