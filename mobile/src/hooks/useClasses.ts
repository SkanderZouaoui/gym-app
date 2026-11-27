import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { bookingsApi, classesApi } from '../api/endpoints';
import type { Booking, ClassSessionSummary } from '../api/types';

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

/** Retouche le cache d'une session (nombre d'inscrits) sans attendre le rechargement réseau. */
function patchSessionCount(queryClient: QueryClient, sessionId: string, delta: number) {
  queryClient.setQueryData<ClassSessionSummary[]>(['classes', 'sessions'], (old) =>
    old?.map((s) => (s.id === sessionId ? { ...s, _count: { bookings: Math.max(0, s._count.bookings + delta) } } : s)),
  );
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['createBooking'],
    mutationFn: (sessionId: string) => bookingsApi.create(sessionId),
    onSuccess: (booking, sessionId) => {
      // Affichage immédiat : la réservation et le compteur apparaissent sans attendre le rechargement.
      const session = queryClient.getQueryData<ClassSessionSummary[]>(['classes', 'sessions'])?.find((s) => s.id === sessionId);
      queryClient.setQueryData<Booking[]>(['me', 'bookings'], (old) => [
        { ...booking, session: booking.session ?? session },
        ...(old ?? []).filter((b) => b.id !== booking.id),
      ]);
      if (booking.status === 'CONFIRMED') patchSessionCount(queryClient, sessionId, 1);
      queryClient.invalidateQueries({ queryKey: ['me', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['classes', 'sessions'] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['cancelBooking'],
    mutationFn: (bookingId: string) => bookingsApi.cancel(bookingId),
    onSuccess: (_data, bookingId) => {
      const cached = queryClient.getQueryData<Booking[]>(['me', 'bookings'])?.find((b) => b.id === bookingId);
      queryClient.setQueryData<Booking[]>(['me', 'bookings'], (old) =>
        old?.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' as const } : b)),
      );
      if (cached?.status === 'CONFIRMED') patchSessionCount(queryClient, cached.sessionId, -1);
      queryClient.invalidateQueries({ queryKey: ['me', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['classes', 'sessions'] });
    },
  });
}
