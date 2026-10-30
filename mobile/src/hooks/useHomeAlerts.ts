import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface HomeAlert {
  id: string;
  title: string;
  message: string;
  /** info | warn | urgent */
  level: string;
  startsOn?: string;
  endsOn?: string;
  isActive?: boolean;
}

/** Alertes à afficher aujourd'hui en haut de l'accueil (publiées par l'admin). */
export function useHomeAlerts() {
  return useQuery({
    queryKey: ['me', 'home-alerts'],
    queryFn: () => apiRequest<HomeAlert[]>('/v1/me/home-alerts'),
  });
}

/** Historique complet (alertes passées comprises) pour l'écran Notifications de l'équipe. */
export function useHomeAlertsHistory() {
  return useQuery({
    queryKey: ['me', 'home-alerts', 'history'],
    queryFn: () => apiRequest<HomeAlert[]>('/v1/me/home-alerts?history=1'),
  });
}

export type DisplayFormat = 'Bandeau' | 'Pop-up' | 'Encart';

/** Formats d'affichage (bandeau, pop-up, encart) choisis par l'admin pour les annonces et les alertes. */
export function useDisplayConfig() {
  return useQuery({
    queryKey: ['me', 'display-config'],
    queryFn: () => apiRequest<{ announcementFormat: DisplayFormat; alertFormat: DisplayFormat }>('/v1/me/display-config'),
    staleTime: 0,
  });
}
