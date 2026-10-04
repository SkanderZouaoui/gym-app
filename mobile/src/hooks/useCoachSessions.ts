import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface CoachSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  classType: { name: string };
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
