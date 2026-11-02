import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AdminDashboard, Member, Membership, Payment, Plan, RosterEntry, SessionSummary, StaffToday } from './types'
import type { PaymentMethod } from '../lib/format'

const get = async <T>(url: string, params?: Record<string, unknown>) => (await api.get<T>(url, { params })).data

// --- Accueil -------------------------------------------------------------------

export const useStaffToday = () => useQuery({ queryKey: ['staff', 'today'], queryFn: () => get<StaffToday>('/v1/staff/today') })

export const useAdminDashboard = (enabled: boolean) =>
  useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => get<AdminDashboard>('/v1/admin/dashboard'), enabled })

// --- Adhérents -----------------------------------------------------------------

const MEMBERS_PAGE = 50

/** Liste d'adhérents (nom, téléphone, e-mail, code) chargée par pages de 50. */
export function useMembers(search: string) {
  const q = useInfiniteQuery({
    queryKey: ['members', 'list', search],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => get<Member[]>('/v1/members', { search, skip: pageParam, take: MEMBERS_PAGE }),
    getNextPageParam: (last, all) => (last.length < MEMBERS_PAGE ? undefined : all.length * MEMBERS_PAGE),
  })
  return { ...q, members: q.data?.pages.flat() ?? [] }
}

export const useMember = (id: string | null) =>
  useQuery({ queryKey: ['members', 'detail', id], queryFn: () => get<Member>(`/v1/members/${id}`), enabled: !!id })

export const useMemberMemberships = (id: string | null) =>
  useQuery({ queryKey: ['members', 'memberships', id], queryFn: () => get<Membership[]>(`/v1/admin/members/${id}/memberships`), enabled: !!id })

export interface MemberPayment {
  id: string
  amount: string
  method: PaymentMethod
  recordedAt: string
  planName: string
}

/** Paiements d'un adhérent sur tous ses abonnements. */
export function useMemberPayments(memberships: Membership[] | undefined) {
  const ids = (memberships ?? []).map((m) => m.id).join(',')
  return useQuery({
    queryKey: ['members', 'payments', ids],
    enabled: !!memberships,
    queryFn: async () => {
      const lists = await Promise.all(
        (memberships ?? []).map(async (m) => (await get<Omit<MemberPayment, 'planName'>[]>(`/v1/memberships/${m.id}/payments`)).map((p) => ({ ...p, planName: m.plan.name }))),
      )
      return lists.flat().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    },
  })
}

export interface CreatedMember extends Member {
  membership: { id: string } | null
  payment: { id: string; amount: number } | null
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { email: string; password: string; firstName: string; lastName: string; phone?: string; planId: string; paymentMethod: PaymentMethod }) =>
      (await api.post<CreatedMember>('/v1/members', payload)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['payments'] })
      void qc.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

// --- Forfaits et caisse --------------------------------------------------------

export const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: () => get<Plan[]>('/v1/plans'), staleTime: 5 * 60_000 })

export interface OrgConfig {
  paymentMethods: Record<PaymentMethod, boolean>
  contact: { name: string }
}
export const useOrgConfig = () => useQuery({ queryKey: ['settings', 'config'], queryFn: () => get<OrgConfig>('/v1/admin/settings/config'), staleTime: 60_000 })

const PAYMENTS_PAGE = 500
const PAYMENTS_MAX_PAGES = 20

/** Encaissements : les 100 derniers, ou tous ceux d'une période (`from` / `to` en ISO), récupérés page par page. */
export function usePayments(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['payments', range?.from ?? '', range?.to ?? ''],
    queryFn: async () => {
      if (!range?.from && !range?.to) return get<Payment[]>('/v1/payments')
      const all: Payment[] = []
      for (let i = 0; i < PAYMENTS_MAX_PAGES; i++) {
        const batch = await get<Payment[]>('/v1/payments', { ...range, skip: i * PAYMENTS_PAGE, take: PAYMENTS_PAGE })
        all.push(...batch)
        if (batch.length < PAYMENTS_PAGE) break
      }
      return all
    },
  })
}

/** Vente : crée l'abonnement de l'adhérent puis enregistre le paiement associé (comme la caisse mobile). */
export function useSellMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; planId: string; amount: number; method: PaymentMethod }) => {
      const membership = (await api.post<Membership>('/v1/admin/memberships', { userId: input.userId, planId: input.planId })).data
      const payment = (await api.post<{ id: string }>('/v1/payments', { membershipId: membership.id, amount: input.amount, method: input.method })).data
      return { membership, payment }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['payments'] })
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['staff'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

// --- Planning et pointage ------------------------------------------------------

export const useSessions = (from: Date, to: Date) =>
  useQuery({
    queryKey: ['sessions', from.toISOString(), to.toISOString()],
    queryFn: () => get<SessionSummary[]>('/v1/classes/sessions', { from: from.toISOString(), to: to.toISOString() }),
  })

export const useRoster = (sessionId: string | null) =>
  useQuery({ queryKey: ['roster', sessionId], queryFn: () => get<RosterEntry[]>(`/v1/sessions/${sessionId}/roster`), enabled: !!sessionId })

export interface ScanOutcome {
  result: 'GRANTED' | 'DENIED'
  reasonCode: string
  member?: { id: string; firstName: string; lastName: string }
}

export function useManualCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { sessionId: string; userId?: string; memberCode?: string }) => (await api.post<ScanOutcome>('/v1/attendance/manual', payload)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roster'] })
      void qc.invalidateQueries({ queryKey: ['sessions'] })
      void qc.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

export function useCancelAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => (await api.patch(`/v1/attendance/${bookingId}/cancel`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roster'] })
      void qc.invalidateQueries({ queryKey: ['staff'] })
    },
  })
}

export function useBookOnBehalf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { userId: string; sessionId: string }) => (await api.post('/v1/bookings/on-behalf', payload)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roster'] })
      void qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export interface ExpiringMembership {
  id: string
  endDate: string
  user: { firstName: string; lastName: string; phone: string | null }
  plan: { name: string }
}
export const useExpiringMemberships = (enabled: boolean) =>
  useQuery({ queryKey: ['admin', 'expiring'], queryFn: () => get<ExpiringMembership[]>('/v1/admin/alerts/expiring-memberships'), enabled })

// --- Actions d'administration sur un adhérent (ADMIN) ---------------------------------

function useInvalidateMember() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['members'] })
    void qc.invalidateQueries({ queryKey: ['staff'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'expiring'] })
  }
}

/** Suspend ou réactive le compte d'un adhérent. */
export function useSetMemberStatus() {
  const done = useInvalidateMember()
  return useMutation({ mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => (await api.patch(`/v1/members/${id}/${suspended ? 'suspend' : 'reactivate'}`)).data, onSuccess: done })
}
export function useDeleteMember() {
  const done = useInvalidateMember()
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/members/${id}`)).data, onSuccess: done })
}
/** Prolonge un abonnement de `days` jours. */
export function useExtendMembership() {
  const done = useInvalidateMember()
  return useMutation({ mutationFn: async ({ id, days }: { id: string; days: number }) => (await api.patch(`/v1/admin/memberships/${id}/extend`, { days })).data, onSuccess: done })
}
export function useSetMembershipSuspended() {
  const done = useInvalidateMember()
  return useMutation({ mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => (await api.patch(`/v1/admin/memberships/${id}/${suspended ? 'suspend' : 'reactivate'}`)).data, onSuccess: done })
}
export function useCancelMembership() {
  const done = useInvalidateMember()
  return useMutation({ mutationFn: async ({ id, reason }: { id: string; reason?: string }) => (await api.patch(`/v1/admin/memberships/${id}/cancel`, { reason })).data, onSuccess: done })
}
