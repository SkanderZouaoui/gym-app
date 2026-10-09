import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, classesApi } from '../api/endpoints';

export function useSessions() {
  return useQuery({
    queryKey: ['classes', 'sessions'],
    queryFn: () => classesApi.findSessions(),
  });
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['classes', 'sessions', 'detail', sessionId],
    queryFn: () => classesApi.findSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => bookingsApi.create(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['classes', 'sessions'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['classes', 'sessions'] });
    },
  });
}
