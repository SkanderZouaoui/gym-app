import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export function useAttendanceCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ['me', 'attendance-calendar', from, to],
    queryFn: () => apiRequest<string[]>(`/v1/me/attendance-calendar?from=${from}&to=${to}`),
  });
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg: string | null;
  measurements: Record<string, number> | null;
  visibility: 'PRIVATE' | 'SHARED_WITH_COACH';
}

export function useBodyMetrics() {
  return useQuery({
    queryKey: ['me', 'body-metrics'],
    queryFn: () => apiRequest<BodyMetric[]>('/v1/me/body-metrics'),
  });
}

export interface CreateBodyMetricInput {
  date?: string;
  weightKg?: number;
  measurements?: Record<string, number>;
  visibility?: 'PRIVATE' | 'SHARED_WITH_COACH';
}

export function useCreateBodyMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['createBodyMetric'],
    mutationFn: (payload: CreateBodyMetricInput) => apiRequest<BodyMetric>('/v1/me/body-metrics', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'body-metrics'] }),
  });
}

export function useDeleteBodyMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['deleteBodyMetric'],
    mutationFn: (id: string) => apiRequest(`/v1/me/body-metrics/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'body-metrics'] }),
  });
}
