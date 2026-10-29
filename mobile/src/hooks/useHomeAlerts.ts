import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface HomeAlert {
  id: string;
  title: string;
  message: string;
  /** info | warn | urgent */
  level: string;
}

/** Alertes à afficher aujourd'hui en haut de l'accueil (publiées par l'admin). */
export function useHomeAlerts() {
  return useQuery({
    queryKey: ['me', 'home-alerts'],
    queryFn: () => apiRequest<HomeAlert[]>('/v1/me/home-alerts'),
  });
}
