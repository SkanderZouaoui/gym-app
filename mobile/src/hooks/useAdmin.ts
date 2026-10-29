import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import type { ProgramDetail, ProgramStatus } from './useCoachSessions';

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

// --- Programmes soumis par les coachs (validation) ------------------------------

export interface ReviewProgram extends ProgramDetail {
  createdBy: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; firstName: string; lastName: string };
  status: ProgramStatus;
  isPublic: boolean;
}

export function useReviewPrograms() {
  return useQuery({
    queryKey: ['admin', 'programs'],
    queryFn: () => apiRequest<ReviewProgram[]>('/v1/admin/programs'),
  });
}

export function useApproveProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/programs/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
      void queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useRejectProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiRequest(`/v1/admin/programs/${id}/reject`, { method: 'POST', body: { note } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
      void queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

// --- Alertes de l'accueil adhérent ---------------------------------------------

export interface AdminHomeAlert {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warn' | 'urgent';
  audience: 'Tous' | 'Actifs' | 'Expirés';
  startsOn: string;
  endsOn: string;
  isActive: boolean;
}

export type HomeAlertInput = Omit<AdminHomeAlert, 'id'>;

export function useAdminHomeAlerts() {
  return useQuery({
    queryKey: ['admin', 'home-alerts'],
    queryFn: () => apiRequest<AdminHomeAlert[]>('/v1/admin/home-alerts'),
  });
}

export function useSaveHomeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<HomeAlertInput> }) =>
      id
        ? apiRequest<AdminHomeAlert>(`/v1/admin/home-alerts/${id}`, { method: 'PATCH', body: data })
        : apiRequest<AdminHomeAlert>('/v1/admin/home-alerts', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'home-alerts'] }),
  });
}

export function useDeleteHomeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/home-alerts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'home-alerts'] }),
  });
}

// --- Abonnements (formules) ---------------------------------------------------

export interface AdminPlan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: string;
  isActive: boolean;
  isVisibleInApp: boolean;
  isPopular: boolean;
  includesLabel: string | null;
}

export interface PlanInput {
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  includesLabel?: string;
  isPopular?: boolean;
  isVisibleInApp?: boolean;
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => apiRequest<AdminPlan[]>('/v1/admin/plans'),
  });
}

export function useSavePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PlanInput> }) =>
      id
        ? apiRequest<AdminPlan>(`/v1/admin/plans/${id}`, { method: 'PATCH', body: data })
        : apiRequest<AdminPlan>('/v1/admin/plans', { method: 'POST', body: data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      void queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useTogglePlanActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest(`/v1/admin/plans/${id}/${active ? 'reactivate' : 'deactivate'}`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      void queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}
