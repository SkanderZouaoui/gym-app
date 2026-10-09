import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface AdminDashboard {
  activeMembers: number;
  attendanceToday: number;
  revenueToday: string | number;
  revenueMonth: string | number;
  classesToday: number;
  avgFillRate: number;
  alerts: { expiringMemberships: number; underfilledClasses: number };
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiRequest<AdminDashboard>('/v1/admin/dashboard'),
  });
}

export interface DailyAttendance {
  days: { date: string; count: number }[];
  currentWeekTotal: number;
  previousWeekTotal: number;
  changePercent: number;
}

/** Présences des 7 derniers jours + variation vs semaine précédente. */
export function useDailyAttendance() {
  return useQuery({
    queryKey: ['admin', 'stats', 'daily-attendance'],
    queryFn: () => apiRequest<DailyAttendance>('/v1/admin/stats/daily-attendance'),
  });
}

export interface ExpiringMembership {
  id: string;
  endDate: string;
  user: { firstName: string; lastName: string; phone: string | null };
  plan: { name: string };
}

export function useExpiringMemberships() {
  return useQuery({
    queryKey: ['admin', 'alerts', 'expiring-memberships'],
    queryFn: () => apiRequest<ExpiringMembership[]>('/v1/admin/alerts/expiring-memberships'),
  });
}
