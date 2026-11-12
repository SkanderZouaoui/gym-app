import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export type BadgeRule = 'SESSIONS' | 'STREAK_WEEKS' | 'MEMBER_MONTHS' | 'ASSIDUITY';

export interface ProfileBadgeDef {
  id: string;
  labelFr: string;
  labelEn: string | null;
  labelAr: string | null;
  icon: string;
  rule: BadgeRule;
  threshold: number;
}

/** Badges du profil, personnalisés depuis le back-office (actifs seulement, dans l'ordre choisi). */
export function useProfileBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: () => apiRequest<ProfileBadgeDef[]>('/v1/badges'),
    staleTime: 10 * 60_000,
  });
}

export const badgeLabel = (b: ProfileBadgeDef, language: string) =>
  (language === 'ar' ? b.labelAr : language === 'en' ? b.labelEn : null)?.trim() || b.labelFr;
