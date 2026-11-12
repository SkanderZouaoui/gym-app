import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type BadgeRule = 'SESSIONS' | 'STREAK_WEEKS' | 'MEMBER_MONTHS' | 'ASSIDUITY'

export interface ProfileBadge {
  id: string
  labelFr: string
  labelEn: string | null
  labelAr: string | null
  /** Nom d'icône Material de l'application mobile (tirets : « emoji-events »). */
  icon: string
  rule: BadgeRule
  threshold: number
  isActive: boolean
  position: number
}

export type BadgeInput = Pick<ProfileBadge, 'labelFr' | 'icon' | 'rule' | 'threshold'> & { labelEn?: string | null; labelAr?: string | null; isActive?: boolean }

export const RULES: { value: BadgeRule; label: string; unit: string; hint: string; max: number }[] = [
  { value: 'SESSIONS', label: 'Nombre de séances', unit: 'séances', hint: 'Entraînements enregistrés et cours suivis, au total.', max: 10000 },
  { value: 'STREAK_WEEKS', label: 'Série de semaines', unit: 'semaines d’affilée', hint: 'Semaines consécutives avec au moins une séance.', max: 520 },
  { value: 'MEMBER_MONTHS', label: 'Ancienneté', unit: 'mois', hint: 'Mois écoulés depuis le premier abonnement.', max: 600 },
  { value: 'ASSIDUITY', label: 'Assiduité', unit: '%', hint: 'Part des 8 dernières semaines avec au moins une séance.', max: 100 },
]

export const ruleText = (rule: BadgeRule, threshold: number) => {
  const r = RULES.find((x) => x.value === rule)!
  return `${r.label} : ${threshold} ${r.unit}`
}

export const useBadges = () => useQuery({ queryKey: ['admin', 'badges'], queryFn: async () => (await api.get<ProfileBadge[]>('/v1/admin/badges')).data })

function useDone() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'badges'] })
    void qc.invalidateQueries({ queryKey: ['badges'] })
  }
}

export function useSaveBadge() {
  const done = useDone()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id?: string } & Partial<BadgeInput>) =>
      (await (id ? api.patch<ProfileBadge>(`/v1/admin/badges/${id}`, body) : api.post<ProfileBadge>('/v1/admin/badges', body))).data,
    onSuccess: done,
  })
}

export function useDeleteBadge() {
  const done = useDone()
  return useMutation({ mutationFn: async (id: string) => api.delete(`/v1/admin/badges/${id}`), onSuccess: done })
}

export function useReorderBadges() {
  const done = useDone()
  return useMutation({ mutationFn: async (ids: string[]) => (await api.put<ProfileBadge[]>('/v1/admin/badges/order', { ids })).data, onSuccess: done })
}
