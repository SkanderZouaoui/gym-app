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
  photoKey: string | null;
  /** URL présignée à durée limitée (5 min) — jamais une URL publique permanente. */
  photoUrl: string | null;
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
  photoKey?: string;
  visibility?: 'PRIVATE' | 'SHARED_WITH_COACH';
}

export function useCreateBodyMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBodyMetricInput) => apiRequest<BodyMetric>('/v1/me/body-metrics', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'body-metrics'] }),
  });
}

export function useDeleteBodyMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/me/body-metrics/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'body-metrics'] }),
  });
}

/** Envoie une photo directement vers le stockage objet (URL présignée),
 * sans transiter par notre API — renvoie la clé à enregistrer sur la mesure. */
export function useUploadProgressPhoto() {
  return useMutation({
    mutationFn: async ({ uri, contentType }: { uri: string; contentType: string }) => {
      const { key, uploadUrl } = await apiRequest<{ key: string; uploadUrl: string }>('/v1/me/photos/upload-url', {
        method: 'POST',
        body: { contentType },
      });
      const blob = await (await fetch(uri)).blob();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error('UPLOAD_FAILED');
      return { key };
    },
  });
}
