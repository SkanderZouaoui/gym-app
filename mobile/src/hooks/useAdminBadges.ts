import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import type { BadgeRule, ProfileBadgeDef } from './useProfileBadges';

export interface AdminBadge extends ProfileBadgeDef {
  isActive: boolean;
  position: number;
}

export interface BadgeInput {
  labelFr: string;
  labelEn: string | null;
  labelAr: string | null;
  icon: string;
  rule: BadgeRule;
  threshold: number;
  isActive: boolean;
}

export const BADGE_RULES: BadgeRule[] = ['SESSIONS', 'STREAK_WEEKS', 'MEMBER_MONTHS', 'ASSIDUITY'];
export const BADGE_RULE_MAX: Record<BadgeRule, number> = { SESSIONS: 10000, STREAK_WEEKS: 520, MEMBER_MONTHS: 600, ASSIDUITY: 100 };

/** Icônes proposées (noms Material de l'application). */
export const BADGE_ICONS = [
  'emoji-events', 'workspace-premium', 'military-tech', 'diamond', 'local-fire-department', 'bolt', 'star', 'verified',
  'fitness-center', 'directions-run', 'timer', 'trending-up', 'favorite', 'celebration', 'flag', 'shield',
] as const;

export function useAdminBadges() {
  return useQuery({ queryKey: ['admin', 'badges'], queryFn: () => apiRequest<AdminBadge[]>('/v1/admin/badges') });
}

function useDone() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
    void qc.invalidateQueries({ queryKey: ['badges'] });
  };
}

export function useSaveBadge() {
  const done = useDone();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string } & Partial<BadgeInput>) =>
      apiRequest<AdminBadge>(id ? `/v1/admin/badges/${id}` : '/v1/admin/badges', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: done,
  });
}

export function useDeleteBadge() {
  const done = useDone();
  return useMutation({ mutationFn: (id: string) => apiRequest(`/v1/admin/badges/${id}`, { method: 'DELETE' }), onSuccess: done });
}

export function useReorderBadges() {
  const done = useDone();
  return useMutation({ mutationFn: (ids: string[]) => apiRequest<AdminBadge[]>('/v1/admin/badges/order', { method: 'PUT', body: { ids } }), onSuccess: done });
}
