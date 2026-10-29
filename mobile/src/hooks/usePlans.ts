import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: string;
  isPopular: boolean;
  isVisibleInApp: boolean;
  includesLabel: string | null;
}

/** Formules proposées par la salle. Par défaut : catalogue visible des adhérents ; `all` = toutes les formules actives (accueil). */
export function usePlans(options?: { all?: boolean }) {
  const all = options?.all ?? false;
  return useQuery({
    queryKey: ['plans', all ? 'all' : 'visible'],
    queryFn: async () => {
      const plans = await apiRequest<MembershipPlan[]>('/v1/plans');
      return all ? plans : plans.filter((p) => p.isVisibleInApp);
    },
  });
}
