import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface StaffTodaySession {
  id: string;
  classTypeName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  room?: string;
  coachName: string | null;
  capacity: number;
  booked: number;
  fillRate: number;
}

export interface StaffToday {
  sessions: StaffTodaySession[];
  attendedToday: number;
}

export function useStaffToday() {
  return useQuery({
    queryKey: ['staff', 'today'],
    queryFn: () => apiRequest<StaffToday>('/v1/staff/today'),
  });
}

export interface MemberSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: string;
}

export function useMemberSearch(query: string) {
  return useQuery({
    queryKey: ['members', 'search', query],
    queryFn: () => apiRequest<MemberSearchResult[]>(`/v1/members?search=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}
