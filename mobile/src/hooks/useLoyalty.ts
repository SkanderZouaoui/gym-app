import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  metric: 'CLASSES_ATTENDED' | 'STREAK_DAYS';
  targetValue: number;
  startDate: string;
  endDate: string;
  pointsReward: number;
}

export interface ChallengeParticipation {
  id: string;
  userId: string;
  progress: number;
  completedAt: string | null;
  user: { firstName: string; lastName: string };
}

export interface PointsTransaction {
  id: string;
  points: number;
  reason: string;
  createdAt: string;
}

export function usePointsHistory() {
  return useQuery({
    queryKey: ['me', 'points', 'history'],
    queryFn: () => apiRequest<PointsTransaction[]>('/v1/me/points/history'),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: ['me', 'streak'],
    queryFn: () => apiRequest<{ streak: number }>('/v1/me/streak'),
  });
}

export function useActiveChallenges() {
  return useQuery({
    queryKey: ['challenges'],
    queryFn: () => apiRequest<Challenge[]>('/v1/challenges'),
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      apiRequest(`/v1/challenges/${challengeId}/join`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  });
}

export function useChallengeLeaderboard(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenges', challengeId, 'leaderboard'],
    queryFn: () => apiRequest<ChallengeParticipation[]>(`/v1/challenges/${challengeId}/leaderboard`),
    enabled: !!challengeId,
  });
}

export function useReferralCode() {
  return useMutation({
    mutationFn: () => apiRequest<{ code: string }>('/v1/me/referral-code', { method: 'POST' }),
  });
}
