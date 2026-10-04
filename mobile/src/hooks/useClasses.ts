import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, classesApi } from '../api/endpoints';

export function useSessions(branchId: string | undefined) {
  return useQuery({
    queryKey: ['classes', 'sessions', branchId],
    queryFn: () => classesApi.findSessions(branchId!),
    enabled: !!branchId,
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
