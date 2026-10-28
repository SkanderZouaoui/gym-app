import { api } from './client';
import type { MeResponse } from '../store/session';
import type {
  AppConfigContent,
  Branding,
  HomeModule,
  AppTab,
  AppString,
  AppLanguages,
  NotifSettings,
  BookingRules,
  Role,
} from '@muscleup/shared';

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
  roles: { role: Role }[];
}

export interface CreateMemberInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export const membersApi = {
  search: (query: string) =>
    api.get<MemberListItem[]>('/v1/members', { params: { search: query } }).then((r) => r.data),
  create: (data: CreateMemberInput) => api.post<MemberListItem>('/v1/members', data).then((r) => r.data),
  update: (id: string, data: UpdateMemberInput) =>
    api.patch<MemberListItem>(`/v1/members/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/v1/members/${id}`),
  suspend: (id: string) => api.patch(`/v1/members/${id}/suspend`),
  reactivate: (id: string) => api.patch(`/v1/members/${id}/reactivate`),
};

// ---------------------------------------------------------------------------
// Équipe (comptes internes Staff + Admin)
// ---------------------------------------------------------------------------

export interface TeamMemberItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  roles: { role: Role }[];
}

export interface CreateTeamMemberInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'STAFF' | 'ADMIN';
}

export const teamApi = {
  findAll: () => api.get<TeamMemberItem[]>('/v1/admin/team').then((r) => r.data),
  create: (data: CreateTeamMemberInput) => api.post<TeamMemberItem>('/v1/admin/users', data).then((r) => r.data),
  update: (id: string, data: UpdateMemberInput) =>
    api.patch<TeamMemberItem>(`/v1/admin/team/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/v1/admin/team/${id}`),
  assignRole: (id: string, role: Role) => api.post(`/v1/admin/users/${id}/roles`, { role }),
  revokeRole: (id: string, role: Role) => api.delete(`/v1/admin/users/${id}/roles/${role}`),
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
  isVisibleInApp: boolean;
  isPopular: boolean;
  includesLabel: string | null;
  displayOrder: number;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  accessCount?: number;
  isContractual?: boolean;
  isVisibleInApp?: boolean;
  isPopular?: boolean;
  includesLabel?: string;
  displayOrder?: number;
}

export const plansApi = {
  findAll: () => api.get<MembershipPlan[]>('/v1/plans').then((r) => r.data),
  findAllForAdmin: () => api.get<MembershipPlan[]>('/v1/admin/plans').then((r) => r.data),
  create: (data: CreatePlanInput) => api.post<MembershipPlan>('/v1/admin/plans', data).then((r) => r.data),
  update: (id: string, data: Partial<CreatePlanInput>) =>
    api.patch<MembershipPlan>(`/v1/admin/plans/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => api.patch(`/v1/admin/plans/${id}/deactivate`),
  reactivate: (id: string) => api.patch(`/v1/admin/plans/${id}/reactivate`),
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

// ---------------------------------------------------------------------------
// Configuration de l'app mobile (CMS back-office : brouillon + publication)
// ---------------------------------------------------------------------------

export interface AppConfigVersion extends AppConfigContent {
  id: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  versionNumber: number;
  note: string | null;
  changedKeys: string[];
  publishedById: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfigHistoryItem extends AppConfigVersion {
  publishedBy: { firstName: string; lastName: string } | null;
}

export interface PatchAppConfigInput {
  branding?: Partial<Branding>;
  homeModules?: HomeModule[];
  tabs?: AppTab[];
  strings?: AppString[];
  languages?: Partial<AppLanguages>;
  notifSettings?: Partial<NotifSettings>;
  bookingRules?: Partial<BookingRules>;
  changeLabel?: string;
}

export const appConfigApi = {
  getDraft: () => api.get<AppConfigVersion>('/v1/admin/app-config/draft').then((r) => r.data),
  patchDraft: (data: PatchAppConfigInput) =>
    api.patch<AppConfigVersion>('/v1/admin/app-config/draft', data).then((r) => r.data),
  discardDraft: () => api.post<AppConfigVersion>('/v1/admin/app-config/draft/discard').then((r) => r.data),
  history: () => api.get<AppConfigHistoryItem[]>('/v1/admin/app-config/history').then((r) => r.data),
  publish: (note?: string) =>
    api.post<AppConfigVersion>('/v1/admin/app-config/publish', { note }).then((r) => r.data),
  restore: (versionId: string) =>
    api.post<AppConfigVersion>(`/v1/admin/app-config/history/${versionId}/restore`).then((r) => r.data),
  getPublic: () => api.get<AppConfigContent & { version: number; publishedAt: string | null }>('/v1/config').then((r) => r.data),
};

export interface PermissionRow {
  permission: string;
  roles: { role: Role; allowed: boolean }[];
}

export const permissionsApi = {
  findAll: () => api.get<PermissionRow[]>('/v1/admin/app-config/permissions').then((r) => r.data),
  set: (permission: string, role: Role, allowed: boolean) =>
    api.patch('/v1/admin/app-config/permissions', { permission, role, allowed }),
};

// ---------------------------------------------------------------------------
// Coachs
// ---------------------------------------------------------------------------

export interface CoachListItem {
  userId: string;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  weeklyClasses: number;
  user: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };
}

export interface CreateCoachInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  specialties?: string[];
  status?: CoachListItem['status'];
}

export const coachesApi = {
  findAll: () => api.get<CoachListItem[]>('/v1/admin/coaches').then((r) => r.data),
  create: (data: CreateCoachInput) => api.post<CoachListItem>('/v1/admin/coaches', data).then((r) => r.data),
  update: (userId: string, data: Partial<Omit<CreateCoachInput, 'password'>>) =>
    api.patch<CoachListItem>(`/v1/admin/coaches/${userId}`, data).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Exercices
// ---------------------------------------------------------------------------

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  mediaKey: string | null;
  instructions: string | null;
  isActive: boolean;
  type: 'STRENGTH' | 'CARDIO' | 'MOBILITY';
  level: string | null;
}

export interface CreateExerciseInput {
  name: string;
  muscleGroup?: string;
  equipment?: string;
  instructions?: string;
  mediaKey?: string;
  type?: ExerciseItem['type'];
  level?: string;
}

export const exercisesApi = {
  findAllForAdmin: (params?: { search?: string }) =>
    api.get<ExerciseItem[]>('/v1/exercises/admin/all', { params }).then((r) => r.data),
  create: (data: CreateExerciseInput) => api.post<ExerciseItem>('/v1/exercises', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateExerciseInput>) =>
    api.patch<ExerciseItem>(`/v1/exercises/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/v1/exercises/${id}`),
};

// ---------------------------------------------------------------------------
// Catalogue de cours (types) & modèles récurrents (planning)
// ---------------------------------------------------------------------------

export interface ClassTypeItem {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  isActive: boolean;
  icon: string;
  tone: string;
  isBookable: boolean;
  defaultCapacity: number;
  defaultDurationMin: number;
}

export interface CreateClassTypeInput {
  name: string;
  description?: string;
  level?: string;
  icon?: string;
  tone?: string;
  isBookable?: boolean;
  defaultCapacity?: number;
  defaultDurationMin?: number;
}

export const classTypesApi = {
  findAllForAdmin: () => api.get<ClassTypeItem[]>('/v1/admin/class-types').then((r) => r.data),
  create: (data: CreateClassTypeInput) => api.post<ClassTypeItem>('/v1/admin/class-types', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateClassTypeInput>) =>
    api.patch<ClassTypeItem>(`/v1/admin/class-types/${id}`, data).then((r) => r.data),
};

export interface ClassTemplateItem {
  id: string;
  classTypeId: string;
  roomId: string | null;
  coachId: string | null;
  capacity: number;
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  isActive: boolean;
  classType: ClassTypeItem;
  room: { id: string; name: string } | null;
  coach: { user: { firstName: string; lastName: string } } | null;
}

export interface CreateClassTemplateInput {
  classTypeId: string;
  roomId?: string;
  coachId?: string;
  capacity: number;
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
}

// ---------------------------------------------------------------------------
// Annonces (envoi immédiat vers l'app adhérent)
// ---------------------------------------------------------------------------

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  planId: string | null;
  tone: 'info' | 'accent' | 'danger';
  sentAt: string | null;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  planId?: string;
  tone?: AnnouncementItem['tone'];
}

export const announcementsApi = {
  findAll: () => api.get<AnnouncementItem[]>('/v1/admin/announcements').then((r) => r.data),
  preview: (data: CreateAnnouncementInput) =>
    api.post<{ recipientCount: number }>('/v1/admin/announcements/preview', data).then((r) => r.data),
  send: (data: CreateAnnouncementInput) =>
    api.post<{ announcement: AnnouncementItem; recipientCount: number }>('/v1/admin/announcements', data).then((r) => r.data),
};

export const classTemplatesApi = {
  findAll: () => api.get<ClassTemplateItem[]>('/v1/admin/class-templates').then((r) => r.data),
  create: (data: CreateClassTemplateInput) =>
    api.post<ClassTemplateItem>('/v1/admin/class-templates', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateClassTemplateInput>) =>
    api.patch<ClassTemplateItem>(`/v1/admin/class-templates/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => api.patch(`/v1/admin/class-templates/${id}/deactivate`),
  delete: (id: string) => api.delete(`/v1/admin/class-templates/${id}`),
  generateSessions: (id: string, from: string, to: string) =>
    api.post(`/v1/admin/class-templates/${id}/generate-sessions`, { from, to }),
};
