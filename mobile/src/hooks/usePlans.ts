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

/** Formules proposées par la salle (catalogue visible dans l'app). */
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => (await apiRequest<MembershipPlan[]>('/v1/plans')).filter((p) => p.isVisibleInApp),
  });
}
