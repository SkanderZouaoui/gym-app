import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  mediaKey: string | null;
  instructions: string | null;
}

export interface ProgramExerciseSetDetail {
  id: string;
  setNumber: number;
  reps: number | null;
  weightKg: string | null;
  restSeconds: number | null;
}

interface ProgramDayExercise {
  id: string;
  sets: number;
  reps: string;
  restSeconds: number | null;
  exercise: { id: string; name: string; muscleGroup: string | null; mediaKey: string | null };
  setDetails: ProgramExerciseSetDetail[];
}

interface ProgramDay {
  id: string;
  dayOfWeek: number;
  label: string | null;
  exercises: ProgramDayExercise[];
}

export interface Program {
  id: string;
  name: string;
  createdById: string;
  assignedToId: string;
  startDate: string | null;
  endDate: string | null;
  days: ProgramDay[];
}

export interface WorkoutLogSet {
  id: string;
  setNumber: number;
  exerciseId: string;
  exercise: { name: string };
  weightKg: string | null;
  reps: number | null;
  rpe: number | null;
}

export interface WorkoutLog {
  id: string;
  date: string;
  feeling: string | null;
  durationMinutes: number | null;
  programId: string | null;
  dayId: string | null;
  program: { id: string; name: string } | null;
  day: { id: string; label: string | null; dayOfWeek: number } | null;
  sets: WorkoutLogSet[];
}

export function useMyPrograms() {
  return useQuery({
    queryKey: ['me', 'programs'],
    queryFn: () => apiRequest<Program[]>('/v1/me/programs'),
  });
}

export function useMyWorkouts() {
  return useQuery({
    queryKey: ['me', 'workouts'],
    queryFn: () => apiRequest<WorkoutLog[]>('/v1/me/workouts'),
  });
}

export interface CreateWorkoutSetInput {
  exerciseId: string;
  setNumber: number;
  weightKg?: number;
  reps?: number;
  rpe?: number;
}

export interface CreateWorkoutLogInput {
  programId?: string;
  dayId?: string;
  feeling?: string;
  durationMinutes?: number;
  sets: CreateWorkoutSetInput[];
}

export function useCreateWorkoutLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkoutLogInput) => apiRequest<WorkoutLog>('/v1/me/workouts', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'workouts'] }),
  });
}

// --- Bibliothèque d'exercices ---------------------------------------------

export function useExercises(
  params: { search?: string; muscleGroup?: string[]; equipment?: string[] } = {},
) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  for (const value of params.muscleGroup ?? []) query.append('muscleGroup', value);
  for (const value of params.equipment ?? []) query.append('equipment', value);
  const qs = query.toString();
  return useQuery({
    queryKey: ['exercises', params.search, params.muscleGroup, params.equipment],
    queryFn: () => apiRequest<Exercise[]>(`/v1/exercises${qs ? `?${qs}` : ''}`),
  });
}

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: ['exercises', 'detail', id],
    queryFn: () => apiRequest<Exercise>(`/v1/exercises/${id}`),
    enabled: !!id,
  });
}

export function useMuscleGroups() {
  return useQuery({
    queryKey: ['exercises', 'muscle-groups'],
    queryFn: () => apiRequest<string[]>('/v1/exercises/muscle-groups'),
  });
}

export function useEquipmentOptions() {
  return useQuery({
    queryKey: ['exercises', 'equipment'],
    queryFn: () => apiRequest<string[]>('/v1/exercises/equipment'),
  });
}

// --- Programme personnel composé par l'adhérent ---------------------------

export interface ProgramExerciseSetInput {
  setNumber: number;
  reps?: number;
  weightKg?: number;
  restSeconds?: number;
}

export interface ProgramExerciseInput {
  exerciseId: string;
  order?: number;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
  setDetails?: ProgramExerciseSetInput[];
}

export interface ProgramDayInput {
  dayOfWeek: number;
  label?: string;
  exercises: ProgramExerciseInput[];
}

export interface CreateOwnProgramInput {
  name: string;
  startDate?: string;
  endDate?: string;
  days: ProgramDayInput[];
}

export function useCreateOwnProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOwnProgramInput) =>
      apiRequest<Program>('/v1/me/programs', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'programs'] }),
  });
}

export function useUpdateOwnProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateOwnProgramInput }) =>
      apiRequest<Program>(`/v1/me/programs/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs', variables.id] });
    },
  });
}

export function useDeleteOwnProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/me/programs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'programs'] }),
  });
}
