import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import type { MeResponse } from '../api/types';
import { useSessionStore } from '../store/session';
import { useMe, useMyBookings } from './useMe';
import { useMyWorkouts } from './useCoaching';

export const GOAL_OPTIONS = ['1-2', '3-4', '5+'] as const;

/** Objectif hebdomadaire = séances par semaine choisies à l'onboarding ('1-2' → 2, '3-4' → 4, '5+' → 5). */
export const goalTarget = (perWeek?: string | null): number => (perWeek === '1-2' ? 2 : perWeek === '5+' ? 5 : 4);

export interface LoggedSession {
  id: string;
  date: Date;
  kind: 'workout' | 'class';
  title: string;
  subtitle: string | null;
  /** Écran de détail de la séance. */
  href: string;
}

export const weekStart = (d: Date): number => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

/** Séances enregistrées (entraînements + cours suivis), la plus récente d'abord, et progression de la semaine. */
export function useWeeklyGoal() {
  const { data: user } = useMe();
  const { data: workouts } = useMyWorkouts();
  const { data: bookings } = useMyBookings();
  const perWeek = (user?.fitnessProfile as { sessionsPerWeek?: string } | null | undefined)?.sessionsPerWeek ?? '3-4';
  const sessions = useMemo<LoggedSession[]>(() => {
    const list: LoggedSession[] = (workouts ?? []).map((w) => ({
      id: `w:${w.id}`,
      date: new Date(w.date),
      kind: 'workout',
      title: w.program?.name ?? w.day?.label ?? '',
      subtitle: w.day?.label ?? null,
      href: `/(member)/workout/${w.id}`,
    }));
    for (const b of bookings ?? []) {
      if (b.status === 'ATTENDED' && b.session) {
        list.push({ id: `b:${b.id}`, date: new Date(b.session.startsAt), kind: 'class', title: b.session.classType.name, subtitle: b.session.room?.name ?? null, href: `/(member)/session/${b.sessionId}` });
      }
    }
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workouts, bookings]);
  const thisWeek = weekStart(new Date());
  const done = sessions.filter((s) => weekStart(s.date) === thisWeek).length;
  return { perWeek, target: goalTarget(perWeek), done, sessions };
}

export function useUpdateWeeklyGoal() {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: (sessionsPerWeek: string) => apiRequest<MeResponse>('/v1/me/weekly-goal', { method: 'PATCH', body: { sessionsPerWeek } }),
    onSuccess: (me) => {
      queryClient.setQueryData(['me'], me);
      const { roles, activeRole } = useSessionStore.getState();
      if (activeRole) setSession(me, roles, activeRole);
    },
  });
}
