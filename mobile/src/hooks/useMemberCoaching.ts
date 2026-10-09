import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface CoachProfileSummary {
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  sessionPrice: string | null;
  rating: string | null;
  reviewCount: number;
}

export interface CoachAvailability {
  id: string;
  coachId: string;
  branchId: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  coach: CoachProfileSummary & { user: { firstName: string; lastName: string } };
}

export interface CoachProfile extends CoachProfileSummary {
  userId: string;
  user: { firstName: string; lastName: string };
}

export function useCoachProfile(coachId: string | undefined) {
  return useQuery({
    queryKey: ['coaching', 'coach', coachId],
    queryFn: () => apiRequest<CoachProfile>(`/v1/coaching/coaches/${coachId}`),
    enabled: !!coachId,
  });
}

export interface MyCoachingSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  coach: { user: { firstName: string; lastName: string } };
}

export function useCoachAvailability(branchId: string | undefined) {
  return useQuery({
    queryKey: ['coaching', 'availability', branchId],
    queryFn: () => apiRequest<CoachAvailability[]>(`/v1/coaching/availability?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

export function useMyCoachingSessions() {
  return useQuery({
    queryKey: ['me', 'coaching-sessions'],
    queryFn: () => apiRequest<MyCoachingSession[]>('/v1/me/coaching-sessions'),
  });
}

export function useRequestCoachingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { coachId: string; branchId: string; startsAt: string; endsAt: string; objective?: string }) =>
      apiRequest('/v1/coaching-sessions', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'coaching-sessions'] }),
  });
}

export function useCancelCoachingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/coaching-sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'coaching-sessions'] }),
  });
}
