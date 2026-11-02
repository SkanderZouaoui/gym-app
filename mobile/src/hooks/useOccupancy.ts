import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OccupancyEstimate, OccupancyPolicy } from '@muscleup/shared';
import { apiRequest } from '../api/client';

/**
 * Estimation de l'occupation de la salle (accueil / admin). C'est une APPROXIMATION :
 * l'afficher toujours comme « Estimation ≈ N », jamais comme un comptage exact.
 */
export function useOccupancy(enabled = true) {
  return useQuery({
    queryKey: ['occupancy'],
    queryFn: () => apiRequest<OccupancyEstimate>('/v1/occupancy'),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useSetOccupancyOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { count: number; durationMinutes?: number; note?: string }) =>
      apiRequest<OccupancyEstimate>('/v1/admin/occupancy/override', { method: 'PATCH', body }),
    onSuccess: (data) => queryClient.setQueryData(['occupancy'], data),
  });
}

export function useClearOccupancyOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<OccupancyEstimate>('/v1/admin/occupancy/override', { method: 'DELETE' }),
    onSuccess: (data) => queryClient.setQueryData(['occupancy'], data),
  });
}

export interface OccupancySettings {
  policy: OccupancyPolicy;
  publicIp: string | null;
  publicIpUpdatedAt: string | null;
  /** IP vue par le serveur pour cette requête (« utiliser mon IP actuelle » depuis le WiFi de la salle). */
  requestIp: string | null;
}

export function useOccupancySettings() {
  return useQuery({
    queryKey: ['admin', 'occupancy-policy'],
    queryFn: () => apiRequest<OccupancySettings>('/v1/admin/settings/occupancy-policy'),
  });
}

export function useSaveOccupancySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OccupancyPolicy & { publicIp: string | null }) =>
      apiRequest<OccupancySettings>('/v1/admin/settings/occupancy-policy', { method: 'PUT', body }),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'occupancy-policy'], data);
      void queryClient.invalidateQueries({ queryKey: ['occupancy'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'setup-alerts'] });
    },
  });
}
