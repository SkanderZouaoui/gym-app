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

export function useAdminDashboard(branchId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'dashboard', branchId],
    queryFn: () => apiRequest<AdminDashboard>(`/v1/admin/dashboard?branchId=${branchId}`),
    enabled: !!branchId,
  });
}
