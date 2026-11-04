import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface StaffTodaySession {
  id: string;
  classTypeName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  room?: string;
  coachName: string | null;
  capacity: number;
  booked: number;
  fillRate: number;
}

export interface StaffToday {
  sessions: StaffTodaySession[];
  attendedToday: number;
}

export function useStaffToday() {
  return useQuery({
    queryKey: ['staff', 'today'],
    queryFn: () => apiRequest<StaffToday>('/v1/staff/today'),
  });
}

export interface MemberSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: string;
  memberCode?: string | null;
  /** URL signée (durée limitée) de la photo de profil, null si l'adhérent n'en a pas. */
  photoUrl?: string | null;
  /** Dernier abonnement (le plus récent), absent si l'adhérent n'en a jamais eu. */
  memberships?: { status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'; endDate: string; plan: { name: string } }[];
}

export function useMemberSearch(query: string) {
  return useQuery({
    queryKey: ['members', 'search', query],
    queryFn: () => apiRequest<MemberSearchResult[]>(`/v1/members?search=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}

// --- Adhérents (liste, fiche, création) ---------------------------------------

export interface MemberDetail extends MemberSearchResult {
  photoUrl: string | null;
  createdAt?: string;
}

const MEMBERS_PAGE = 50;

/** Liste d'adhérents filtrée par nom, téléphone ou e-mail (vide = tous), chargée par pages de 50 : `fetchNextPage` au défilement. */
export function useMembers(query: string) {
  const q = useInfiniteQuery({
    queryKey: ['members', 'list', query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiRequest<MemberSearchResult[]>(`/v1/members?search=${encodeURIComponent(query)}&skip=${pageParam}&take=${MEMBERS_PAGE}`),
    getNextPageParam: (last, all) => (last.length < MEMBERS_PAGE ? undefined : all.length * MEMBERS_PAGE),
  });
  const data = useMemo(() => q.data?.pages.flat(), [q.data]);
  return { ...q, data };
}

export function useMemberDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['members', 'detail', id],
    queryFn: () => apiRequest<MemberDetail>(`/v1/members/${id}`),
    enabled: !!id,
  });
}

export interface StaffMembership {
  id: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  plan: { id: string; name: string; durationDays: number; price: string };
}

export function useMemberMemberships(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['members', 'memberships', id],
    queryFn: () => apiRequest<StaffMembership[]>(`/v1/admin/members/${id}/memberships`),
    enabled: !!id && enabled,
  });
}

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';

export interface StaffPayment {
  id: string;
  amount: string;
  method: PaymentMethod;
  recordedAt: string;
  reference: string | null;
  membership: {
    id: string;
    userId: string;
    startDate: string;
    endDate: string;
    user: { firstName: string; lastName: string; photoUrl?: string | null };
    plan: { name: string };
  };
}

const PAYMENTS_PAGE = 500;
const PAYMENTS_MAX_PAGES = 20;

/** Encaissements de la caisse : les 100 derniers, ou tous ceux d'une période (`from`/`to` en ISO), récupérés page par page. */
export function usePayments(range?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (range?.from) qs.set('from', range.from);
  if (range?.to) qs.set('to', range.to);
  const q = qs.toString();
  return useQuery({
    queryKey: ['staff', 'payments', range?.from ?? '', range?.to ?? ''],
    queryFn: async () => {
      if (!range?.from && !range?.to) return apiRequest<StaffPayment[]>('/v1/payments');
      const all: StaffPayment[] = [];
      for (let i = 0; i < PAYMENTS_MAX_PAGES; i++) {
        const batch = await apiRequest<StaffPayment[]>(`/v1/payments?${q}&skip=${i * PAYMENTS_PAGE}&take=${PAYMENTS_PAGE}`);
        all.push(...batch);
        if (batch.length < PAYMENTS_PAGE) break;
      }
      return all;
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      email: string; password: string; firstName: string; lastName: string; phone?: string;
      /** Forfait et moyen de paiement : le compte, l'abonnement et l'encaissement sont créés ensemble. */
      planId: string; paymentMethod: PaymentMethod;
    }) =>
      apiRequest<MemberDetail & { membership: { id: string } | null; payment: { id: string; amount: number } | null }>('/v1/members', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

/** Encaissement : crée l'abonnement de l'adhérent puis enregistre le paiement associé. */
export function useSellMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; planId: string; amount: number; method: PaymentMethod }) => {
      const membership = await apiRequest<StaffMembership>('/v1/admin/memberships', {
        method: 'POST',
        body: { userId: input.userId, planId: input.planId },
      });
      const payment = await apiRequest<{ id: string }>('/v1/payments', {
        method: 'POST',
        body: { membershipId: membership.id, amount: input.amount, method: input.method },
      });
      return { membership, payment };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'payments'] });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export interface MemberPayment {
  id: string;
  amount: string;
  method: PaymentMethod;
  recordedAt: string;
  planName: string;
}

/** Paiements d'un adhérent (tous ses abonnements), indépendamment de qui les a encaissés. */
export function useMemberPayments(memberships: StaffMembership[] | undefined) {
  const ids = (memberships ?? []).map((m) => m.id).join(',');
  return useQuery({
    queryKey: ['members', 'payments', ids],
    enabled: !!memberships,
    queryFn: async () => {
      const lists = await Promise.all(
        (memberships ?? []).map(async (m) => {
          const payments = await apiRequest<Omit<MemberPayment, 'planName'>[]>(`/v1/memberships/${m.id}/payments`);
          return payments.map((p) => ({ ...p, planName: m.plan.name }));
        }),
      );
      return lists.flat().sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
    },
  });
}

/** Adhérent dont la connexion pose problème : bloqué temporairement (trop d'échecs), échecs récents ou compte désactivé. */
export interface LoginIssue {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  memberCode: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  reason: 'LOCKED' | 'FAILED_ATTEMPTS' | 'SUSPENDED';
  failures: number;
  lockCount: number;
  lockedUntil: string | null;
  lastAttemptAt: string | null;
}

/** Comptes adhérents bloqués ou en difficulté de connexion (accueil et admin), rafraîchis régulièrement. */
export function useLoginIssues() {
  return useQuery({
    queryKey: ['members', 'login-issues'],
    queryFn: () => apiRequest<LoginIssue[]>('/v1/members/login-issues'),
    refetchInterval: 20_000,
  });
}

/** Lève le blocage de connexion d'un adhérent pour qu'il puisse réessayer tout de suite. */
export function useUnlockLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ ok: true }>(`/v1/members/${id}/unlock-login`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', 'login-issues'] }),
  });
}

/** Réinitialisation du mot de passe d'un adhérent (accueil ou admin) : renvoie le mot de passe provisoire. */
export function resetMemberPassword(id: string) {
  return apiRequest<{ password: string }>(`/v1/members/${id}/reset-password`, { method: 'POST' });
}

// --- Actions d'administration sur un adhérent (admin uniquement, comme l'API) -----------

function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['members'] });
    void queryClient.invalidateQueries({ queryKey: ['staff'] });
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };
}

/** Suspend ou réactive le compte d'un adhérent. */
export function useSetMemberStatus() {
  const done = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => apiRequest(`/v1/members/${id}/${suspended ? 'suspend' : 'reactivate'}`, { method: 'PATCH' }),
    onSuccess: done,
  });
}
export function useDeleteMember() {
  const done = useInvalidateMembers();
  return useMutation({ mutationFn: (id: string) => apiRequest(`/v1/members/${id}`, { method: 'DELETE' }), onSuccess: done });
}
/** Prolonge un abonnement de `days` jours. */
export function useExtendMembership() {
  const done = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => apiRequest(`/v1/admin/memberships/${id}/extend`, { method: 'PATCH', body: { days } }),
    onSuccess: done,
  });
}
export function useSetMembershipSuspended() {
  const done = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => apiRequest(`/v1/admin/memberships/${id}/${suspended ? 'suspend' : 'reactivate'}`, { method: 'PATCH' }),
    onSuccess: done,
  });
}
export function useCancelMembership() {
  const done = useInvalidateMembers();
  return useMutation({ mutationFn: (id: string) => apiRequest(`/v1/admin/memberships/${id}/cancel`, { method: 'PATCH', body: {} }), onSuccess: done });
}
