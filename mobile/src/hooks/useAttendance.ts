import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface ScanOutcome {
  result: 'GRANTED' | 'DENIED';
  reasonCode: string;
  member?: { id: string; firstName: string; lastName: string; photoKey: string | null };
}

export interface RosterEntry {
  id: string;
  status: string;
  bookingCode: string;
  user: { id: string; firstName: string; lastName: string; photoKey: string | null };
}

export function useScan() {
  return useMutation({
    mutationFn: (payload: { token: string; sessionId: string }) =>
      apiRequest<ScanOutcome>('/v1/attendance/scan', { method: 'POST', body: payload }),
  });
}

export function useManualCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { sessionId: string; userId?: string; bookingCode?: string }) =>
      apiRequest<ScanOutcome>('/v1/attendance/manual', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useRoster(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['roster', sessionId],
    queryFn: () => apiRequest<RosterEntry[]>(`/v1/sessions/${sessionId}/roster`),
    enabled: !!sessionId,
  });
}

export function useTodaySessions(branchId: string | undefined) {
  return useQuery({
    queryKey: ['classes', 'sessions', 'today', branchId],
    queryFn: () => {
      const today = new Date();
      const from = new Date(today);
      from.setHours(0, 0, 0, 0);
      const to = new Date(today);
      to.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        branchId: branchId!,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      return apiRequest<
        {
          id: string;
          startsAt: string;
          endsAt: string;
          classType: { name: string };
          coach: { user: { firstName: string; lastName: string } } | null;
          _count: { bookings: number };
          capacity: number;
        }[]
      >(`/v1/classes/sessions?${params.toString()}`);
    },
    enabled: !!branchId,
  });
}
