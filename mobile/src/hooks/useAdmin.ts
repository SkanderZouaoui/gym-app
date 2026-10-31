import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import type { ProgramDetail, ProgramStatus } from './useCoachSessions';
import { WEEKDAYS_LONG_MON } from '../i18n/labels';

export interface AdminDashboard {
  activeMembers: number;
  attendanceToday: number;
  revenueToday: string | number;
  revenueMonth: string | number;
  classesToday: number;
  newMembersToday?: number;
  paymentsToday?: number;
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
  audience: 'Tous' | 'Actifs' | 'Expirés' | 'Équipe' | 'Accueil' | 'Coachs';
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
  activeSubscribers?: number;
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

// --- Configuration de présence ----------------------------------------------

export interface AttendancePolicy {
  scanOpensMinutesBefore: number;
  scanClosesMinutesAfterStart: number;
  allowWalkIn: boolean;
  noShowGraceMinutes: number;
  noShowPenalty: { enabled: boolean; threshold: number; windowDays: number; blockBookingDays: number };
  staffCanRecordPayments: boolean;
}

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  scanOpensMinutesBefore: 15,
  scanClosesMinutesAfterStart: 10,
  allowWalkIn: false,
  noShowGraceMinutes: 15,
  noShowPenalty: { enabled: false, threshold: 3, windowDays: 30, blockBookingDays: 7 },
  staffCanRecordPayments: true,
};

export function useAttendancePolicy() {
  return useQuery({
    queryKey: ['settings', 'attendance'],
    queryFn: async () => {
      const s = await apiRequest<{ attendancePolicy: AttendancePolicy }>('/v1/admin/settings');
      return { ...DEFAULT_ATTENDANCE_POLICY, ...s.attendancePolicy };
    },
    staleTime: 60_000,
  });
}

export function useUpdateAttendancePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy: AttendancePolicy) => apiRequest('/v1/admin/settings/attendance', { method: 'PUT', body: policy }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// --- Planning (cours) --------------------------------------------------------

export interface AdminCoach {
  userId: string;
  user: { firstName: string; lastName: string };
}
export interface AdminRoom {
  id: string;
  name: string;
  capacity: number;
}
export interface AdminClassType {
  id: string;
  name: string;
  defaultCapacity: number;
  defaultDurationMin: number;
}

export function useAdminCoaches() {
  return useQuery({ queryKey: ['admin', 'coaches'], queryFn: () => apiRequest<AdminCoach[]>('/v1/admin/coaches') });
}
export function useAdminRooms() {
  return useQuery({ queryKey: ['admin', 'rooms'], queryFn: () => apiRequest<AdminRoom[]>('/v1/admin/rooms') });
}
export function useAdminClassTypes() {
  return useQuery({ queryKey: ['admin', 'class-types'], queryFn: () => apiRequest<AdminClassType[]>('/v1/admin/class-types') });
}

function useInvalidateSessions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['classes'] });
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };
}

export function useSetSessionCapacity() {
  const done = useInvalidateSessions();
  return useMutation({
    mutationFn: ({ id, capacity }: { id: string; capacity: number }) =>
      apiRequest(`/v1/admin/sessions/${id}/capacity`, { method: 'PATCH', body: { capacity } }),
    onSuccess: done,
  });
}
export function useReplaceSessionCoach() {
  const done = useInvalidateSessions();
  return useMutation({
    mutationFn: ({ id, coachId }: { id: string; coachId: string | null }) =>
      apiRequest(`/v1/admin/sessions/${id}/coach`, { method: 'PATCH', body: { coachId } }),
    onSuccess: done,
  });
}
export function useCancelSession() {
  const done = useInvalidateSessions();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/sessions/${id}/cancel`, { method: 'POST', body: {} }),
    onSuccess: done,
  });
}
export interface SessionInput {
  classTypeId: string;
  startsAt: string;
  durationMin?: number;
  coachId: string | null;
  roomId: string | null;
  capacity: number;
}
export function useSaveSession() {
  const done = useInvalidateSessions();
  return useMutation({
    mutationFn: ({ id, ...body }: SessionInput & { id?: string }) =>
      apiRequest(id ? `/v1/admin/sessions/${id}` : '/v1/admin/sessions', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: done,
  });
}
export function useDeleteSession() {
  const done = useInvalidateSessions();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: done,
  });
}

// --- Annonces ------------------------------------------------------------------

export interface Announcement {
  id: string;
  title: string;
  body: string;
  planId: string | null;
  tone: 'info' | 'accent' | 'danger';
  sentAt: string | null;
  startsOn: string | null;
  endsOn: string | null;
  push: boolean;
  audience?: 'MEMBERS' | 'STAFF' | 'COACH' | 'TEAM' | 'ALL';
  createdAt: string;
}
export interface AnnouncementInput {
  title: string;
  body: string;
  planId?: string;
  tone?: 'info' | 'accent' | 'danger';
  startsOn?: string;
  endsOn?: string;
  push?: boolean;
  audience?: 'MEMBERS' | 'STAFF' | 'COACH' | 'TEAM' | 'ALL';
}

export function useAnnouncements() {
  return useQuery({ queryKey: ['admin', 'announcements'], queryFn: () => apiRequest<Announcement[]>('/v1/admin/announcements') });
}
export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnouncementInput) =>
      apiRequest<{ announcement: Announcement; recipientCount: number }>('/v1/admin/announcements', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; body?: string; startsOn?: string | null; endsOn?: string | null }) =>
      apiRequest<Announcement>(`/v1/admin/announcements/${id}`, { method: 'PATCH', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  });
}
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/announcements/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  });
}

// --- Équipe d'accueil -----------------------------------------------------------

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  /** URL signée (durée limitée) de la photo de profil, null si aucune. */
  photoUrl?: string | null;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | string;
  createdAt: string;
  roles: { role: string }[];
}
export function useTeam() {
  return useQuery({ queryKey: ['admin', 'team'], queryFn: () => apiRequest<TeamMember[]>('/v1/admin/team') });
}
export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; password: string; firstName: string; lastName: string; phone?: string; role: 'STAFF' | 'COACH' }) =>
      apiRequest<TeamMember>('/v1/admin/users', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'team'] }),
  });
}
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: 'ACTIVE' | 'SUSPENDED'; firstName?: string; lastName?: string; phone?: string }) =>
      apiRequest<TeamMember>(`/v1/admin/team/${id}`, { method: 'PATCH', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'team'] }),
  });
}

// --- Types de cours et salles (configuration) ------------------------------------

export interface AdminClassTypeFull extends AdminClassType {
  isActive: boolean;
  level?: string | null;
  /** Clés de stockage des photos de la fiche cours (galerie) et leurs URLs de lecture signées. */
  galleryKeys: string[];
  galleryUrls: string[];
}

export function useAllClassTypes() {
  return useQuery({ queryKey: ['admin', 'class-types'], queryFn: () => apiRequest<AdminClassTypeFull[]>('/v1/admin/class-types') });
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'class-types'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
    void queryClient.invalidateQueries({ queryKey: ['classes'] });
  };
}

export function useSaveClassType() {
  const done = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; defaultCapacity?: number; defaultDurationMin?: number; isActive?: boolean }) =>
      apiRequest<AdminClassTypeFull>(id ? `/v1/admin/class-types/${id}` : '/v1/admin/class-types', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: done,
  });
}
export function useDeleteClassType() {
  const done = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ deleted: boolean; deactivated: boolean }>(`/v1/admin/class-types/${id}`, { method: 'DELETE' }),
    onSuccess: done,
  });
}
export function useSaveRoom() {
  const done = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; capacity: number }) =>
      apiRequest<AdminRoom>(id ? `/v1/admin/rooms/${id}` : '/v1/admin/rooms', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: done,
  });
}
export function useDeleteRoom() {
  const done = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/rooms/${id}`, { method: 'DELETE' }),
    onSuccess: done,
  });
}


// --- Notifications push : envoi, programmation, règles récurrentes -------------------

export interface AudienceOption {
  key: string;
  label: string;
  count: number;
}
export function useAudiences() {
  return useQuery({
    queryKey: ['admin', 'notifications', 'audiences'],
    queryFn: () => apiRequest<{ audiences: AudienceOption[]; conditions: Record<string, number> }>('/v1/admin/notifications/audiences'),
  });
}

export interface ScheduledNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  audience: string;
  sendAt: string;
  status: string;
  sentCount: number;
  sentAt: string | null;
}
export interface SentNotification extends ScheduledNotification {
  openedCount: number;
  openRate: number;
}
export type RuleCondition = 'NONE' | 'EXPIRES_7D' | 'ABSENT_14D' | 'CLASS_TOMORROW';
export interface NotificationRule {
  id: string;
  title: string;
  body: string;
  audience: string;
  condition: RuleCondition;
  days: number[];
  time: string;
  isActive: boolean;
}

export function useScheduledNotifications() {
  return useQuery({ queryKey: ['admin', 'notifications', 'scheduled'], queryFn: () => apiRequest<ScheduledNotification[]>('/v1/admin/notifications/scheduled') });
}
export function useNotificationHistory() {
  return useQuery({ queryKey: ['admin', 'notifications', 'history'], queryFn: () => apiRequest<SentNotification[]>('/v1/admin/notifications/history') });
}
export function useNotificationRules() {
  return useQuery({ queryKey: ['admin', 'notifications', 'rules'], queryFn: () => apiRequest<NotificationRule[]>('/v1/admin/notifications/rules') });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
}
export function useSendNotification() {
  const done = useInvalidateNotifications();
  return useMutation({
    mutationFn: (input: { kind: string; title: string; body: string; audience: string; sendAt?: string }) =>
      apiRequest<ScheduledNotification>('/v1/admin/notifications', { method: 'POST', body: input }),
    onSuccess: done,
  });
}
export function useCancelScheduledNotification() {
  const done = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/notifications/scheduled/${id}`, { method: 'DELETE' }),
    onSuccess: done,
  });
}
export function useCreateNotificationRule() {
  const done = useInvalidateNotifications();
  return useMutation({
    mutationFn: (input: Omit<NotificationRule, 'id' | 'isActive'>) =>
      apiRequest<NotificationRule>('/v1/admin/notifications/rules', { method: 'POST', body: input }),
    onSuccess: done,
  });
}
export function useToggleNotificationRule() {
  const done = useInvalidateNotifications();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest(`/v1/admin/notifications/rules/${id}`, { method: 'PATCH', body: { isActive } }),
    onSuccess: done,
  });
}
export function useDeleteNotificationRule() {
  const done = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/notifications/rules/${id}`, { method: 'DELETE' }),
    onSuccess: done,
  });
}

// --- Configuration de la salle ------------------------------------------------------

export interface OrganizationConfig {
  contact: { address: string; phone: string; email: string; visibleToMembers: boolean };
  hours: { open: boolean; from: string; to: string }[];
  paymentMethods: { CASH: boolean; OTHER: boolean; TRANSFER: boolean; CHECK: boolean };
  announcements: { format: 'Bandeau' | 'Pop-up' | 'Encart'; alertFormat: 'Bandeau' | 'Pop-up' | 'Encart'; push: boolean; expiryReminderDays: number };
  booking: { cancelHoursBefore: number; defaultCapacity: number; waitlist: boolean };
  discounts: Record<string, number>;
}

export function useOrganizationConfig() {
  return useQuery({
    queryKey: ['settings', 'config'],
    queryFn: () => apiRequest<OrganizationConfig>('/v1/admin/settings/config'),
    staleTime: 60_000,
  });
}
export function useUpdateOrganizationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: OrganizationConfig) => apiRequest<OrganizationConfig>('/v1/admin/settings/config', { method: 'PUT', body: config }),
    onSuccess: (data) => queryClient.setQueryData(['settings', 'config'], data),
  });
}

export interface CoachDetails {
  userId: string;
  bio: string | null;
  specialties: string[];
  yearsExperience: number | null;
  status: string;
}
export function useCoachDetails(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'coaches', userId],
    enabled: !!userId,
    queryFn: () => apiRequest<CoachDetails>(`/v1/admin/coaches/${userId}`),
  });
}
export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/admin/team/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'team'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'coaches'] });
    },
  });
}

export interface TeamStats {
  days: number;
  staff: {
    scans: number;
    scansGranted: number;
    payments: number;
    paymentsTotal: number;
    accountsCreated: number;
    daysWorked: number;
    hours: number;
    avgHoursPerDay: number;
    estimated: boolean;
    source?: 'planning' | 'activity';
  } | null;
  coach: {
    plannedDays?: number | null;
    plannedHours?: number | null;
    sessions: number;
    attendees: number;
    upcoming: number;
    daysWorked: number;
    hours: number;
    avgHoursPerDay: number;
    estimated: boolean;
  } | null;
}
export function useTeamStats(id: string | undefined, days: number) {
  return useQuery({
    queryKey: ['admin', 'team', id, 'stats', days],
    enabled: !!id,
    queryFn: () => apiRequest<TeamStats>(`/v1/admin/team/${id}/stats?days=${days}`),
  });
}

// --- Planning de travail --------------------------------------------------------------

export interface WorkDay {
  dayOfWeek: number; // 0 = lundi
  working: boolean;
  startTime: string;
  endTime: string;
}
export function useWorkSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'team', id, 'schedule'],
    enabled: !!id,
    queryFn: () => apiRequest<WorkDay[]>(`/v1/admin/team/${id}/schedule`),
  });
}
export function useSaveWorkSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: WorkDay[] }) =>
      apiRequest<WorkDay[]>(`/v1/admin/team/${id}/schedule`, { method: 'PUT', body: { days } }),
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'team', v.id] });
      void queryClient.invalidateQueries({ queryKey: ['me', 'schedule'] });
    },
  });
}
export function useMySchedule() {
  return useQuery({ queryKey: ['me', 'schedule'], queryFn: () => apiRequest<WorkDay[]>('/v1/me/schedule') });
}

export const WEEK_DAYS = WEEKDAYS_LONG_MON;
export function shiftHours(d: WorkDay): number {
  if (!d.working) return 0;
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return Math.max(0, (m(d.endTime) - m(d.startTime)) / 60);
}

export interface SetupAlert {
  key: string;
  severity: 'warning' | 'danger' | 'info';
  title: string;
  detail: string;
  route: string;
  params?: Record<string, string | number>;
}
/** Éléments de configuration manquants (planning d'équipe, forfaits, salles, coordonnées…). */
export function useSetupAlerts() {
  return useQuery({
    queryKey: ['admin', 'setup-alerts'],
    queryFn: () => apiRequest<SetupAlert[]>('/v1/admin/alerts/setup'),
    staleTime: 0,
  });
}

/** Réinitialisation du mot de passe d'un membre de l'équipe (admin) : renvoie le mot de passe provisoire. */
export function resetTeamPassword(id: string) {
  return apiRequest<{ password: string }>(`/v1/admin/team/${id}/reset-password`, { method: 'POST' });
}

// --- Bibliothèque d'exercices (admin) ------------------------------------------------

export interface AdminExercise {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  instructions: string | null;
  level: string | null;
  type: 'STRENGTH' | 'CARDIO' | 'MOBILITY';
  isActive: boolean;
  usedInPrograms?: number;
}

export function useAdminExercises(params: { search?: string; muscleGroup?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.muscleGroup) qs.append('muscleGroup', params.muscleGroup);
  const q = qs.toString();
  return useQuery({
    queryKey: ['admin', 'exercises', params.search ?? '', params.muscleGroup ?? ''],
    queryFn: () => apiRequest<AdminExercise[]>(`/v1/exercises/admin/all${q ? `?${q}` : ''}`),
  });
}
export function useAdminExercise(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'exercise', id],
    enabled: !!id,
    queryFn: () => apiRequest<AdminExercise>(`/v1/exercises/${id}`),
  });
}
export function useSaveExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; muscleGroup?: string; equipment?: string; level?: string; instructions?: string; type?: string }) =>
      apiRequest<AdminExercise>(id ? `/v1/exercises/${id}` : '/v1/exercises', { method: id ? 'PATCH' : 'POST', body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'exercise'] });
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}
export function useDeactivateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/exercises/${id}/deactivate`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] });
      void queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}

/** Icône Material par groupe musculaire (libellés de la bibliothèque). */
export function muscleIcon(group: string): 'fitness-center' | 'directions-run' | 'self-improvement' | 'accessibility-new' | 'sports-gymnastics' | 'whatshot' {
  const g = group.toLowerCase();
  if (/jambe|cuisse|quad|ischio|hamstring|glute|fessier|mollet|calves|adductor|abductor/.test(g)) return 'directions-run';
  if (/cardio/.test(g)) return 'whatshot';
  if (/abs|abdo|gainage|core|serratus/.test(g)) return 'accessibility-new';
  if (/mobilit|souplesse|étirement|levator/.test(g)) return 'self-improvement';
  if (/dos|lats|traps|spine|upper back/.test(g)) return 'sports-gymnastics';
  return 'fitness-center';
}

export interface TeamOnShift {
  id: string;
  firstName: string;
  lastName: string;
  role: 'STAFF' | 'COACH';
  startTime: string;
  endTime: string;
  onDutyNow: boolean;
}
/** Équipe planifiée aujourd'hui (planning de travail). */
export function useTeamOnShift() {
  return useQuery({ queryKey: ['admin', 'team-on-shift'], queryFn: () => apiRequest<TeamOnShift[]>('/v1/admin/team-on-shift') });
}
