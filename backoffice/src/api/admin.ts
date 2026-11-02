import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

const get = async <T>(url: string, params?: Record<string, unknown>) => (await api.get<T>(url, { params })).data

// --- Forfaits -------------------------------------------------------------------

export interface AdminPlan {
  id: string
  name: string
  description: string | null
  durationDays: number
  price: string
  isActive: boolean
  isVisibleInApp: boolean
  isPopular: boolean
  includesLabel: string | null
  activeSubscribers?: number
}
export interface PlanInput {
  name: string
  description?: string
  durationDays: number
  price: number
  includesLabel?: string
  isPopular?: boolean
  isVisibleInApp?: boolean
}

export const useAdminPlans = () => useQuery({ queryKey: ['admin', 'plans'], queryFn: () => get<AdminPlan[]>('/v1/admin/plans') })

export function useSavePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<PlanInput> }) =>
      id ? (await api.patch<AdminPlan>(`/v1/admin/plans/${id}`, data)).data : (await api.post<AdminPlan>('/v1/admin/plans', data)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
      void qc.invalidateQueries({ queryKey: ['plans'] })
    },
  })
}

export function useTogglePlanActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => (await api.patch(`/v1/admin/plans/${id}/${active ? 'reactivate' : 'deactivate'}`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
      void qc.invalidateQueries({ queryKey: ['plans'] })
    },
  })
}

// --- Configuration de la salle (réglages) ---------------------------------------

export interface OrganizationConfig {
  contact: { name: string; latitude: number | null; longitude: number | null; address: string; phone: string; email: string; visibleToMembers: boolean }
  hours: { open: boolean; from: string; to: string }[]
  paymentMethods: { CASH: boolean; OTHER: boolean; TRANSFER: boolean; CHECK: boolean }
  announcements: { format: 'Bandeau' | 'Pop-up' | 'Encart'; alertFormat: 'Bandeau' | 'Pop-up' | 'Encart'; push: boolean; expiryReminderDays: number }
  booking: { cancelHoursBefore: number; defaultCapacity: number; waitlist: boolean }
  discounts: Record<string, number>
}

export const useOrganizationConfig = () => useQuery({ queryKey: ['settings', 'config'], queryFn: () => get<OrganizationConfig>('/v1/admin/settings/config'), staleTime: 60_000 })

export function useUpdateOrganizationConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (config: OrganizationConfig) => (await api.put<OrganizationConfig>('/v1/admin/settings/config', config)).data,
    onSuccess: (data) => {
      qc.setQueryData(['settings', 'config'], data)
      void qc.invalidateQueries({ queryKey: ['venue'] })
    },
  })
}

// --- Équipe ---------------------------------------------------------------------

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  email: string | null
  phone: string | null
  status: 'ACTIVE' | 'SUSPENDED' | string
  createdAt: string
  roles: { role: string }[]
}

export const useTeam = () => useQuery({ queryKey: ['admin', 'team'], queryFn: () => get<TeamMember[]>('/v1/admin/team') })

export function useCreateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { email: string; password: string; firstName: string; lastName: string; phone?: string; role: 'STAFF' | 'COACH' }) =>
      (await api.post<TeamMember>('/v1/admin/users', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'team'] }),
  })
}

export function useUpdateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; status?: 'ACTIVE' | 'SUSPENDED'; firstName?: string; lastName?: string; phone?: string }) =>
      (await api.patch<TeamMember>(`/v1/admin/team/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'team'] }),
  })
}

export function useDeleteTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/v1/admin/team/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'team'] }),
  })
}

export const resetTeamPassword = async (id: string) => (await api.post<{ password: string }>(`/v1/admin/team/${id}/reset-password`)).data

export interface WorkDay {
  dayOfWeek: number // 0 = lundi
  working: boolean
  startTime: string
  endTime: string
}
export const useWorkSchedule = (id: string | null) =>
  useQuery({ queryKey: ['admin', 'team', id, 'schedule'], enabled: !!id, queryFn: () => get<WorkDay[]>(`/v1/admin/team/${id}/schedule`) })

export function useSaveWorkSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, days }: { id: string; days: WorkDay[] }) => (await api.put<WorkDay[]>(`/v1/admin/team/${id}/schedule`, { days })).data,
    onSuccess: (_d, v) => void qc.invalidateQueries({ queryKey: ['admin', 'team', v.id] }),
  })
}

export function shiftHours(d: WorkDay): number {
  if (!d.working) return 0
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  return Math.max(0, (m(d.endTime) - m(d.startTime)) / 60)
}

export interface TeamStats {
  days: number
  staff: { scans: number; scansGranted: number; payments: number; paymentsTotal: number; accountsCreated: number; daysWorked: number; hours: number; avgHoursPerDay: number; estimated: boolean } | null
  coach: { plannedDays?: number | null; plannedHours?: number | null; sessions: number; attendees: number; upcoming: number; daysWorked: number; hours: number; avgHoursPerDay: number; estimated: boolean } | null
}
export const useTeamStats = (id: string | null, days: number) =>
  useQuery({ queryKey: ['admin', 'team', id, 'stats', days], enabled: !!id, queryFn: () => get<TeamStats>(`/v1/admin/team/${id}/stats`, { days }) })

// --- Présence (règles de pointage) -----------------------------------------------

export interface AttendancePolicy {
  scanOpensMinutesBefore: number
  scanClosesMinutesAfterStart: number
  allowWalkIn: boolean
  noShowGraceMinutes: number
  noShowPenalty: { enabled: boolean; threshold: number; windowDays: number; blockBookingDays: number }
  staffCanRecordPayments: boolean
}
export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  scanOpensMinutesBefore: 15,
  scanClosesMinutesAfterStart: 10,
  allowWalkIn: false,
  noShowGraceMinutes: 15,
  noShowPenalty: { enabled: false, threshold: 3, windowDays: 30, blockBookingDays: 7 },
  staffCanRecordPayments: true,
}

export const useAttendancePolicy = () =>
  useQuery({
    queryKey: ['settings', 'attendance'],
    queryFn: async () => ({ ...DEFAULT_ATTENDANCE_POLICY, ...(await get<{ attendancePolicy: AttendancePolicy }>('/v1/admin/settings')).attendancePolicy }),
    staleTime: 60_000,
  })

export function useUpdateAttendancePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (policy: AttendancePolicy) => (await api.put('/v1/admin/settings/attendance', policy)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

// --- Identité de la salle : logo, galerie, position -------------------------------

export interface VenueIdentity {
  logoUrl: string | null
  gallery: { galleryKeys: string[]; galleryUrls: string[]; galleryThumbUrls?: string[] }
}
export const useVenueIdentity = () => useQuery({ queryKey: ['venue'], queryFn: () => get<VenueIdentity>('/v1/venue') })

export function useVenueLogo() {
  const qc = useQueryClient()
  const done = () => void qc.invalidateQueries({ queryKey: ['venue'] })
  return {
    async upload(file: File) {
      const { data } = await api.post<{ key: string; uploadUrl: string }>('/v1/admin/settings/logo/upload-url', { contentType: file.type, sizeBytes: file.size })
      const put = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!put.ok) throw new Error('UPLOAD_FAILED')
      await api.put('/v1/admin/settings/logo', { key: data.key })
      done()
    },
    async remove() {
      await api.delete('/v1/admin/settings/logo')
      done()
    },
  }
}

/** Position d'un lien Google Maps (court ou long) ou de coordonnées collées, résolue par l'API. */
export const resolveLocation = async (text: string) => (await api.post<{ latitude: number; longitude: number }>('/v1/admin/settings/resolve-location', { text })).data

// --- Tableau de bord admin ---------------------------------------------------------

export interface DailyAttendance {
  days: { date: string; count: number }[]
  currentWeekTotal: number
  previousWeekTotal: number
  changePercent: number
}
export const useDailyAttendance = (enabled: boolean) =>
  useQuery({ queryKey: ['admin', 'stats', 'daily-attendance'], queryFn: () => get<DailyAttendance>('/v1/admin/stats/daily-attendance'), enabled })

export interface SetupAlert {
  key: string
  severity: 'warning' | 'danger' | 'info'
  title: string
  detail: string
  route: string
}
/** Éléments de configuration manquants (planning d'équipe, forfaits, salles, coordonnées…). */
export const useSetupAlerts = (enabled: boolean) => useQuery({ queryKey: ['admin', 'setup-alerts'], queryFn: () => get<SetupAlert[]>('/v1/admin/alerts/setup'), enabled, staleTime: 0 })

/** Route de l'application mobile → page équivalente du back-office. */
export function webRoute(route: string): string {
  const path = route.replace('/(admin)', '').replace('/(tabs)', '')
  if (path.startsWith('/occupancy-settings')) return '/settings?section=occupancy'
  if (path.startsWith('/settings')) return path
  return path || '/'
}
