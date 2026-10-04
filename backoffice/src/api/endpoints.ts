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

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export const branchesApi = {
  findAll: () => api.get<Branch[]>('/v1/branches').then((r) => r.data),
  create: (data: Partial<Branch>) => api.post('/v1/branches', data).then((r) => r.data),
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
  getDashboard: (branchId?: string) =>
    api
      .get<AdminDashboard>('/v1/admin/dashboard', { params: branchId ? { branchId } : {} })
      .then((r) => r.data),
};

export interface MemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  homeBranchId: string | null;
}

export const membersApi = {
  search: (query: string, branchId?: string) =>
    api
      .get<MemberListItem[]>('/v1/members', { params: { search: query, branchId } })
      .then((r) => r.data),
  suspend: (id: string) => api.patch(`/v1/members/${id}/suspend`),
  reactivate: (id: string) => api.patch(`/v1/members/${id}/reactivate`),
};

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: string;
  accessScope: string;
  isActive: boolean;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  branchIds?: string[];
}

export const plansApi = {
  findAll: () => api.get<MembershipPlan[]>('/v1/plans').then((r) => r.data),
  create: (data: CreatePlanInput) => api.post('/v1/admin/plans', data).then((r) => r.data),
  update: (id: string, data: Partial<CreatePlanInput>) =>
    api.patch(`/v1/admin/plans/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => api.patch(`/v1/admin/plans/${id}/deactivate`),
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
  findSessions: (branchId: string, from?: string, to?: string) =>
    api.get<ClassSession[]>('/v1/classes/sessions', { params: { branchId, from, to } }).then((r) => r.data),
  cancelSession: (id: string, reason?: string) =>
    api.post(`/v1/admin/sessions/${id}/cancel`, { reason }),
};

export interface MultiBranchPolicy {
  defaultAccessScope: 'HOME_ONLY' | 'ALL' | 'SELECTED';
  crossBranchBooking: {
    mode: 'DISABLED' | 'ENABLED' | 'LIMITED';
    monthlyQuota: number | null;
    bookingWindowHours: number | null;
  };
}

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
  multiBranchPolicy: MultiBranchPolicy;
  attendancePolicy: AttendancePolicy;
}

export const settingsApi = {
  get: () => api.get<OrganizationSettings>('/v1/admin/settings').then((r) => r.data),
  updateMultiBranch: (data: MultiBranchPolicy) =>
    api.put('/v1/admin/settings/multi-branch', data).then((r) => r.data),
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
  getLogs: (branchId: string) =>
    api.get<AttendanceScanLog[]>('/v1/admin/attendance/logs', { params: { branchId } }).then((r) => r.data),
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
  getOverview: (branchId: string, from: string, to: string) =>
    api.get<StatsOverview>('/v1/admin/stats/overview', { params: { branchId, from, to } }).then((r) => r.data),
  exportPaymentsCsv: (branchId: string, from: string, to: string) =>
    api
      .get('/v1/admin/stats/export/payments.csv', { params: { branchId, from, to }, responseType: 'blob' })
      .then((r) => r.data as Blob),
};
