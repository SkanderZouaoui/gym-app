import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

interface ProgramDay {
  id: string;
  dayOfWeek: number;
  label: string | null;
  exercises: {
    id: string;
    sets: number;
    reps: string;
    exercise: { id: string; name: string; muscleGroup: string | null };
  }[];
}

interface Program {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  days: ProgramDay[];
}

interface WorkoutLog {
  id: string;
  date: string;
  feeling: string | null;
  sets: { id: string; exercise: { name: string }; weightKg: string | null; reps: number | null }[];
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
