import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import { meApi } from '../api/endpoints';
import { useSessionStore } from '../store/session';
import { useNetworkStatusContext } from './NetworkStatusContext';
import type { Program, WorkoutLog, Exercise } from './useCoaching';
import type { ClassSessionSummary } from '../api/types';

/** Précharge en arrière-plan toutes les données persistées (voir la whitelist de
 * app/_layout.tsx) dès qu'on est authentifié et en ligne, pour que les écrans membre
 * restent utilisables hors-ligne même sans navigation préalable — en particulier le
 * détail de chaque programme (nécessaire à la séance guidée) et les exercices qui y
 * figurent (nécessaires à la bibliothèque et aux fiches détail). */
export function usePrefetchOfflineData() {
  const queryClient = useQueryClient();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const { isOnline } = useNetworkStatusContext();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isOnline || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      const [programs, workouts] = await Promise.all([
        queryClient.fetchQuery({ queryKey: ['me', 'programs'], queryFn: () => apiRequest<Program[]>('/v1/me/programs') }).catch(() => undefined),
        queryClient.fetchQuery({ queryKey: ['me', 'workouts'], queryFn: () => apiRequest<WorkoutLog[]>('/v1/me/workouts') }).catch(() => undefined),
        queryClient.prefetchQuery({ queryKey: ['me'], queryFn: meApi.getMe }),
        queryClient.prefetchQuery({ queryKey: ['me', 'memberships'], queryFn: meApi.getMemberships }),
        queryClient.prefetchQuery({ queryKey: ['me', 'bookings'], queryFn: meApi.getBookings }),
        queryClient.prefetchQuery({ queryKey: ['me', 'announcements'], queryFn: () => apiRequest<unknown>('/v1/me/announcements') }),
        queryClient.prefetchQuery({ queryKey: ['me', 'notifications'], queryFn: () => apiRequest<unknown>('/v1/me/notifications') }),
        queryClient.prefetchQuery({ queryKey: ['me', 'body-metrics'], queryFn: () => apiRequest<unknown>('/v1/me/body-metrics') }),
        queryClient.prefetchQuery({ queryKey: ['classes', 'sessions'], queryFn: () => apiRequest<ClassSessionSummary[]>('/v1/classes/sessions') }),
        queryClient.prefetchQuery({ queryKey: ['exercises', undefined, undefined, undefined], queryFn: () => apiRequest<Exercise[]>('/v1/exercises') }),
        queryClient.prefetchQuery({ queryKey: ['exercises', 'muscle-groups'], queryFn: () => apiRequest<string[]>('/v1/exercises/muscle-groups') }),
        queryClient.prefetchQuery({ queryKey: ['exercises', 'equipment'], queryFn: () => apiRequest<string[]>('/v1/exercises/equipment') }),
      ]);

      const exerciseIds = new Set<string>();
      for (const log of workouts ?? []) {
        for (const s of log.sets) exerciseIds.add(s.exerciseId);
      }
      for (const program of programs ?? []) {
        for (const day of program.days) {
          for (const ex of day.exercises) exerciseIds.add(ex.exercise.id);
        }
      }

      await Promise.all([
        ...(programs ?? []).map((p) =>
          queryClient.prefetchQuery({
            queryKey: ['programs', p.id],
            queryFn: () => apiRequest<Program & { days: Program['days'] }>(`/v1/programs/${p.id}`),
          }),
        ),
        ...Array.from(exerciseIds).map((id) =>
          queryClient.prefetchQuery({
            queryKey: ['exercises', 'detail', id],
            queryFn: () => apiRequest<Exercise>(`/v1/exercises/${id}`),
          }),
        ),
      ]).catch(() => undefined);
    })();
  }, [isAuthenticated, isOnline, queryClient]);
}
