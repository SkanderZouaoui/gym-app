import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reportedBy: { firstName: string; lastName: string };
}

export function useOpenReports() {
  return useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () => apiRequest<Report[]>('/v1/admin/reports'),
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/reports/${id}/resolve`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'open'] }),
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/reports/${id}/dismiss`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'open'] }),
  });
}
