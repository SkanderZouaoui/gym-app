import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OccupancyEstimate, OccupancyPolicy } from '@muscleup/shared'
import { api } from './client'

/**
 * Estimation de l'occupation de la salle (accueil, admin). C'est une APPROXIMATION (WiFi de la salle + activité de
 * l'app) : toujours l'afficher comme « Estimation ≈ N », jamais comme un comptage exact.
 */
export const useOccupancy = () => useQuery({ queryKey: ['occupancy'], queryFn: async () => (await api.get<OccupancyEstimate>('/v1/occupancy')).data, refetchInterval: 60_000 })

export function useSetOccupancyOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { count: number; durationMinutes?: number; note?: string }) => (await api.patch<OccupancyEstimate>('/v1/admin/occupancy/override', body)).data,
    onSuccess: (data) => qc.setQueryData(['occupancy'], data),
  })
}
export function useClearOccupancyOverride() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async () => (await api.delete<OccupancyEstimate>('/v1/admin/occupancy/override')).data, onSuccess: (data) => qc.setQueryData(['occupancy'], data) })
}

export interface OccupancySettings {
  policy: OccupancyPolicy
  publicIp: string | null
  publicIpUpdatedAt: string | null
  /** IP vue par le serveur pour cette requête (« utiliser mon IP actuelle » depuis le WiFi de la salle). */
  requestIp: string | null
}
export const useOccupancySettings = () => useQuery({ queryKey: ['admin', 'occupancy-policy'], queryFn: async () => (await api.get<OccupancySettings>('/v1/admin/settings/occupancy-policy')).data })

export function useSaveOccupancySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: OccupancyPolicy & { publicIp: string | null }) => (await api.put<OccupancySettings>('/v1/admin/settings/occupancy-policy', body)).data,
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'occupancy-policy'], data)
      void qc.invalidateQueries({ queryKey: ['occupancy'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'setup-alerts'] })
    },
  })
}
