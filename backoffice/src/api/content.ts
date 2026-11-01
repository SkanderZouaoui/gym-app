import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

const get = async <T>(url: string, params?: Record<string, unknown>) => (await api.get<T>(url, { params })).data

// --- Programmes à valider --------------------------------------------------------

export type ProgramStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export interface ProgramExercise {
  id: string
  order: number
  sets: number
  reps: string
  restSeconds: number | null
  notes: string | null
  exercise: { id: string; name: string; muscleGroup: string | null; mediaKey: string | null }
}
export interface ReviewProgram {
  id: string
  name: string
  level: string | null
  goal: string | null
  status: ProgramStatus
  rejectionNote: string | null
  isPublic: boolean
  createdAt: string
  reviewedAt: string | null
  createdBy: { id: string; firstName: string; lastName: string }
  assignedTo: { id: string; firstName: string; lastName: string }
  days: { id: string; dayOfWeek: number; label: string | null; exercises: ProgramExercise[] }[]
}

export const useReviewPrograms = () => useQuery({ queryKey: ['admin', 'programs'], queryFn: () => get<ReviewProgram[]>('/v1/admin/programs') })

function useInvalidatePrograms() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'programs'] })
    void qc.invalidateQueries({ queryKey: ['programs'] })
  }
}
export function useApproveProgram() {
  const done = useInvalidatePrograms()
  return useMutation({ mutationFn: async (id: string) => (await api.post(`/v1/admin/programs/${id}/approve`)).data, onSuccess: done })
}
export function useRejectProgram() {
  const done = useInvalidatePrograms()
  return useMutation({ mutationFn: async ({ id, note }: { id: string; note?: string }) => (await api.post(`/v1/admin/programs/${id}/reject`, { note })).data, onSuccess: done })
}

// --- Exercices -------------------------------------------------------------------

export interface Exercise {
  id: string
  name: string
  muscleGroup: string | null
  equipment: string | null
  instructions: string | null
  level: string | null
  type: 'STRENGTH' | 'CARDIO' | 'MOBILITY'
  mediaKey: string | null
  isActive: boolean
  usedInPrograms?: number
}

export const useExercises = (search: string, muscleGroup: string) =>
  useQuery({ queryKey: ['admin', 'exercises', search, muscleGroup], queryFn: () => get<Exercise[]>('/v1/exercises/admin/all', { search: search || undefined, muscleGroup: muscleGroup || undefined }) })
export const useMuscleGroups = () => useQuery({ queryKey: ['exercises', 'muscle-groups'], queryFn: () => get<string[]>('/v1/exercises/muscle-groups'), staleTime: 10 * 60_000 })

export function useSaveExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id?: string; name: string; muscleGroup?: string; equipment?: string; level?: string; instructions?: string; type?: string }) =>
      (await (id ? api.patch<Exercise>(`/v1/exercises/${id}`, body) : api.post<Exercise>('/v1/exercises', body))).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'exercises'] })
      void qc.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}
export function useDeactivateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/v1/exercises/${id}/deactivate`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'exercises'] })
      void qc.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}

// --- Annonces --------------------------------------------------------------------

export type AnnouncementAudience = 'MEMBERS' | 'STAFF' | 'COACH' | 'TEAM' | 'ALL'
export interface Announcement {
  id: string
  title: string
  body: string
  tone: 'info' | 'accent' | 'danger'
  sentAt: string | null
  startsOn: string | null
  endsOn: string | null
  push: boolean
  audience?: AnnouncementAudience
  createdAt: string
}
export interface AnnouncementInput {
  title: string
  body: string
  tone?: Announcement['tone']
  startsOn?: string
  endsOn?: string
  push?: boolean
  audience?: AnnouncementAudience
}

export const useAnnouncements = () => useQuery({ queryKey: ['admin', 'announcements'], queryFn: () => get<Announcement[]>('/v1/admin/announcements') })
const useInvalidate = (key: string[]) => {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: key })
}
export function useSendAnnouncement() {
  const done = useInvalidate(['admin', 'announcements'])
  return useMutation({ mutationFn: async (input: AnnouncementInput) => (await api.post<{ announcement: Announcement; recipientCount: number }>('/v1/admin/announcements', input)).data, onSuccess: done })
}
export function useUpdateAnnouncement() {
  const done = useInvalidate(['admin', 'announcements'])
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title?: string; body?: string; startsOn?: string | null; endsOn?: string | null }) => (await api.patch<Announcement>(`/v1/admin/announcements/${id}`, body)).data,
    onSuccess: done,
  })
}
export function useDeleteAnnouncement() {
  const done = useInvalidate(['admin', 'announcements'])
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/admin/announcements/${id}`)).data, onSuccess: done })
}

// --- Alertes de l'accueil adhérent -----------------------------------------------

export type AlertAudience = 'Tous' | 'Actifs' | 'Expirés' | 'Équipe' | 'Accueil' | 'Coachs'
export interface HomeAlert {
  id: string
  title: string
  message: string
  level: 'info' | 'warn' | 'urgent'
  audience: AlertAudience
  startsOn: string
  endsOn: string
  isActive: boolean
}
export type HomeAlertInput = Omit<HomeAlert, 'id'>

export const useHomeAlerts = () => useQuery({ queryKey: ['admin', 'home-alerts'], queryFn: () => get<HomeAlert[]>('/v1/admin/home-alerts') })
export function useSaveHomeAlert() {
  const done = useInvalidate(['admin', 'home-alerts'])
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<HomeAlertInput> }) =>
      (await (id ? api.patch<HomeAlert>(`/v1/admin/home-alerts/${id}`, data) : api.post<HomeAlert>('/v1/admin/home-alerts', data))).data,
    onSuccess: done,
  })
}
export function useDeleteHomeAlert() {
  const done = useInvalidate(['admin', 'home-alerts'])
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/admin/home-alerts/${id}`)).data, onSuccess: done })
}

// --- Notifications push ----------------------------------------------------------

export interface Audience {
  key: string
  label: string
  count: number
}
export interface ScheduledNotification {
  id: string
  kind: string
  title: string
  body: string
  audience: string
  sendAt: string
  status: string
  sentCount: number
  sentAt: string | null
}
export interface SentNotification extends ScheduledNotification {
  openedCount: number
  openRate: number
}
export type RuleCondition = 'NONE' | 'EXPIRES_7D' | 'ABSENT_14D' | 'CLASS_TOMORROW'
export interface NotificationRule {
  id: string
  title: string
  body: string
  audience: string
  condition: RuleCondition
  days: number[]
  time: string
  isActive: boolean
}

export const useAudiences = () => useQuery({ queryKey: ['admin', 'notifications', 'audiences'], queryFn: () => get<{ audiences: Audience[]; conditions: Record<string, number> }>('/v1/admin/notifications/audiences') })
export const useScheduledNotifications = () => useQuery({ queryKey: ['admin', 'notifications', 'scheduled'], queryFn: () => get<ScheduledNotification[]>('/v1/admin/notifications/scheduled') })
export const useNotificationHistory = () => useQuery({ queryKey: ['admin', 'notifications', 'history'], queryFn: () => get<SentNotification[]>('/v1/admin/notifications/history') })
export const useNotificationRules = () => useQuery({ queryKey: ['admin', 'notifications', 'rules'], queryFn: () => get<NotificationRule[]>('/v1/admin/notifications/rules') })

export function useSendNotification() {
  const done = useInvalidate(['admin', 'notifications'])
  return useMutation({ mutationFn: async (input: { kind: string; title: string; body: string; audience: string; sendAt?: string }) => (await api.post<ScheduledNotification>('/v1/admin/notifications', input)).data, onSuccess: done })
}
export function useCancelScheduledNotification() {
  const done = useInvalidate(['admin', 'notifications'])
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/admin/notifications/scheduled/${id}`)).data, onSuccess: done })
}
export function useCreateNotificationRule() {
  const done = useInvalidate(['admin', 'notifications'])
  return useMutation({ mutationFn: async (input: Omit<NotificationRule, 'id' | 'isActive'>) => (await api.post<NotificationRule>('/v1/admin/notifications/rules', input)).data, onSuccess: done })
}
export function useToggleNotificationRule() {
  const done = useInvalidate(['admin', 'notifications'])
  return useMutation({ mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => (await api.patch(`/v1/admin/notifications/rules/${id}`, { isActive })).data, onSuccess: done })
}
export function useDeleteNotificationRule() {
  const done = useInvalidate(['admin', 'notifications'])
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/admin/notifications/rules/${id}`)).data, onSuccess: done })
}
