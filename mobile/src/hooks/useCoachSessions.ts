import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface CoachSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  classType: { id: string; name: string; description: string | null };
  room: { name: string } | null;
  _count: { bookings: number };
  capacity: number;
}

export function useCoachSessions() {
  return useQuery({
    queryKey: ['coach', 'sessions'],
    queryFn: () => apiRequest<CoachSession[]>('/v1/coach/sessions'),
  });
}

export interface RosterEntry {
  id: string;
  sessionId: string;
  userId: string;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  waitlistPosition: number | null;
  bookingCode: string;
  attendedAt: string | null;
  user: { id: string; firstName: string; lastName: string; photoKey: string | null };
}

export function useSessionRoster(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'roster'],
    queryFn: () => apiRequest<RosterEntry[]>(`/v1/sessions/${sessionId}/roster`),
    enabled: !!sessionId,
  });
}

export function useManualCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { sessionId: string; userId: string }) =>
      apiRequest('/v1/attendance/manual', { method: 'POST', body: payload }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.sessionId, 'roster'] });
    },
  });
}

// --- Séances individuelles confirmées/en attente du coach -----------------

export interface CoachCoachingSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  member: { firstName: string; lastName: string };
}

/** Séances individuelles du coach (confirmées + en attente) — à ne pas confondre
 * avec useMyCoachingSessions (vue élève sur /v1/me/coaching-sessions). */
export function useCoachCoachingSessions() {
  return useQuery({
    queryKey: ['coach', 'coaching-sessions'],
    queryFn: () => apiRequest<CoachCoachingSession[]>('/v1/coach/coaching-sessions'),
  });
}

// --- Demandes de séance individuelle --------------------------------------

export interface PendingCoachingSession {
  id: string;
  startsAt: string;
  endsAt: string;
  objective: string | null;
  member: { id: string; firstName: string; lastName: string; photoKey: string | null };
}

export function useCoachPendingSessions() {
  return useQuery({
    queryKey: ['coach', 'coaching-sessions', 'pending'],
    queryFn: () => apiRequest<PendingCoachingSession[]>('/v1/coach/coaching-sessions/pending'),
  });
}

export function useConfirmCoachingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/coach/coaching-sessions/${id}/confirm`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach', 'coaching-sessions', 'pending'] }),
  });
}

export function useDeclineCoachingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/coach/coaching-sessions/${id}/decline`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach', 'coaching-sessions', 'pending'] }),
  });
}

// --- Élèves suivis par le coach -------------------------------------------

export interface CoachStudent {
  id: string;
  firstName: string;
  lastName: string;
  photoKey: string | null;
}

export function useCoachStudents() {
  return useQuery({
    queryKey: ['coach', 'students'],
    queryFn: () => apiRequest<CoachStudent[]>('/v1/coach/students'),
  });
}

export interface StudentWorkoutLog {
  id: string;
  date: string;
  feeling: string | null;
  sets: { id: string; exerciseId: string; exercise: { name: string }; weightKg: string | null; reps: number | null }[];
}

export function useStudentWorkouts(memberId: string | undefined) {
  return useQuery({
    queryKey: ['coach', 'students', memberId, 'workouts'],
    queryFn: () => apiRequest<StudentWorkoutLog[]>(`/v1/coach/students/${memberId}/workouts`),
    enabled: !!memberId,
  });
}

export interface CoachProgramSummary {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  assignedTo: { id: string; firstName: string; lastName: string };
}

export function useCoachPrograms() {
  return useQuery({
    queryKey: ['coach', 'programs'],
    queryFn: () => apiRequest<CoachProgramSummary[]>('/v1/coach/programs'),
  });
}

export interface ProgramExerciseSetDetail {
  id: string;
  setNumber: number;
  reps: number | null;
  weightKg: string | null;
  restSeconds: number | null;
}

export interface ProgramDetail {
  id: string;
  name: string;
  createdById: string;
  assignedToId: string;
  days: {
    id: string;
    dayOfWeek: number;
    label: string | null;
    exercises: {
      id: string;
      sets: number;
      reps: string;
      restSeconds: number | null;
      exercise: { id: string; name: string; muscleGroup: string | null; mediaKey: string | null };
      setDetails: ProgramExerciseSetDetail[];
    }[];
  }[];
}

export function useProgramDetail(programId: string | undefined) {
  return useQuery({
    queryKey: ['programs', programId],
    queryFn: () => apiRequest<ProgramDetail>(`/v1/programs/${programId}`),
    enabled: !!programId,
  });
}

export interface AssignProgramExerciseSetInput {
  setNumber: number;
  reps?: number;
  weightKg?: number;
  restSeconds?: number;
}

export interface AssignProgramExerciseInput {
  exerciseId: string;
  order?: number;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
  setDetails?: AssignProgramExerciseSetInput[];
}

export interface AssignProgramDayInput {
  dayOfWeek: number;
  label?: string;
  exercises: AssignProgramExerciseInput[];
}

export interface AssignProgramInput {
  name: string;
  assignedToId: string;
  startDate?: string;
  endDate?: string;
  days: AssignProgramDayInput[];
}

export function useAssignProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignProgramInput) => apiRequest('/v1/coach/programs', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'programs'] });
      queryClient.invalidateQueries({ queryKey: ['coach', 'students'] });
    },
  });
}
