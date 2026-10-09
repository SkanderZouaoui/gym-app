import { api } from './client';
import type { MeResponse } from '../store/session';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/v1/auth/login', { email, password }).then((r) => r.data),
  logout: (refreshToken: string) => api.post('/v1/auth/logout', { refreshToken }),
};

export const meApi = {
  getMe: () => api.get<MeResponse>('/v1/me').then((r) => r.data),
};

export interface AdminDashboard {
  activeMembers: number;
  attendanceToday: number;
  revenueToday: string | number;
  revenueMonth: string | number;
  classesToday: number;
  avgFillRate: number;
  alerts: { expiringMemberships: number; underfilledClasses: number };
}

export const adminApi = {
  getDashboard: () => api.get<AdminDashboard>('/v1/admin/dashboard').then((r) => r.data),
};

export interface MemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export const membersApi = {
  search: (query: string) =>
    api.get<MemberListItem[]>('/v1/members', { params: { search: query } }).then((r) => r.data),
  suspend: (id: string) => api.patch(`/v1/members/${id}/suspend`),
  reactivate: (id: string) => api.patch(`/v1/members/${id}/reactivate`),
};

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: string;
  accessCount: number | null;
  isContractual: boolean;
  isActive: boolean;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  accessCount?: number;
  isContractual?: boolean;
}

export const plansApi = {
  findAll: () => api.get<MembershipPlan[]>('/v1/plans').then((r) => r.data),
  create: (data: CreatePlanInput) => api.post('/v1/admin/plans', data).then((r) => r.data),
  update: (id: string, data: Partial<CreatePlanInput>) =>
    api.patch(`/v1/admin/plans/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => api.patch(`/v1/admin/plans/${id}/deactivate`),
};

export interface Membership {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  plan: { id: string; name: string; durationDays: number; price: string };
}

export interface CreateMembershipInput {
  userId: string;
  planId: string;
  startDate?: string;
}

export interface RenewMembershipInput {
  planId?: string;
  startDate?: string;
}

export const membershipsApi = {
  findForMember: (userId: string) =>
    api.get<Membership[]>(`/v1/admin/members/${userId}/memberships`).then((r) => r.data),
  create: (data: CreateMembershipInput) =>
    api.post<Membership>('/v1/admin/memberships', data).then((r) => r.data),
  suspend: (id: string) => api.patch(`/v1/admin/memberships/${id}/suspend`),
  reactivate: (id: string) => api.patch(`/v1/admin/memberships/${id}/reactivate`),
  extend: (id: string, days: number) => api.patch(`/v1/admin/memberships/${id}/extend`, { days }),
  cancel: (id: string, reason?: string) => api.patch(`/v1/admin/memberships/${id}/cancel`, { reason }),
  renew: (id: string, data: RenewMembershipInput) => api.patch(`/v1/admin/memberships/${id}/renew`, data),
};

export interface ClassSession {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: string;
  classType: { name: string };
  room: { name: string } | null;
  coach: { user: { firstName: string; lastName: string } } | null;
  _count: { bookings: number };
}

export const classesApi = {
  findSessions: (from?: string, to?: string) =>
    api.get<ClassSession[]>('/v1/classes/sessions', { params: { from, to } }).then((r) => r.data),
  cancelSession: (id: string, reason?: string) =>
    api.post(`/v1/admin/sessions/${id}/cancel`, { reason }),
};

export interface AttendancePolicy {
  scanOpensMinutesBefore: number;
  scanClosesMinutesAfterStart: number;
  allowWalkIn: boolean;
  noShowGraceMinutes: number;
  noShowPenalty: {
    enabled: boolean;
    threshold: number;
    windowDays: number;
    blockBookingDays: number;
  };
  staffCanRecordPayments: boolean;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  attendancePolicy: AttendancePolicy;
}

export const settingsApi = {
  get: () => api.get<OrganizationSettings>('/v1/admin/settings').then((r) => r.data),
  updateAttendance: (data: AttendancePolicy) =>
    api.put('/v1/admin/settings/attendance', data).then((r) => r.data),
};

export interface AttendanceScanLog {
  id: string;
  result: 'GRANTED' | 'DENIED';
  reasonCode: string;
  offline: boolean;
  scannedAt: string;
  session: { startsAt: string; classType: { name: string } };
  user: { firstName: string; lastName: string } | null;
}

export const attendanceApi = {
  getLogs: () => api.get<AttendanceScanLog[]>('/v1/admin/attendance/logs').then((r) => r.data),
};

export interface StatsOverview {
  attendance: {
    sessionsCount: number;
    totalCapacity: number;
    totalBooked: number;
    fillRate: number;
    attended: number;
    noShow: number;
    noShowRate: number;
  };
  revenue: {
    total: number;
    byMethod: { method: string; amount: number; count: number }[];
  };
  newMembers: {
    total: number;
    byDay: { date: string; count: number }[];
  };
  retention: {
    cohortSize: number;
    retainedCount: number;
    retentionRate: number;
    churnRate: number;
  };
}

export const statsApi = {
  getOverview: (from: string, to: string) =>
    api.get<StatsOverview>('/v1/admin/stats/overview', { params: { from, to } }).then((r) => r.data),
  exportPaymentsCsv: (from: string, to: string) =>
    api
      .get('/v1/admin/stats/export/payments.csv', { params: { from, to }, responseType: 'blob' })
      .then((r) => r.data as Blob),
};
