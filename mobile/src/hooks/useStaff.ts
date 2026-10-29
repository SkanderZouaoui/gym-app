import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/** Liste d'adhérents (25 premiers résultats) filtrée par nom, téléphone ou e-mail ; vide = tous. */
export function useMembers(query: string) {
  return useQuery({
    queryKey: ['members', 'list', query],
    queryFn: () => apiRequest<MemberSearchResult[]>(`/v1/members?search=${encodeURIComponent(query)}`),
  });
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

export function useMemberMemberships(id: string | undefined) {
  return useQuery({
    queryKey: ['members', 'memberships', id],
    queryFn: () => apiRequest<StaffMembership[]>(`/v1/admin/members/${id}/memberships`),
    enabled: !!id,
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
    user: { firstName: string; lastName: string };
    plan: { name: string };
  };
}

/** 50 derniers encaissements de la caisse. */
export function usePayments() {
  return useQuery({
    queryKey: ['staff', 'payments'],
    queryFn: () => apiRequest<StaffPayment[]>('/v1/payments'),
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
      apiRequest<MemberDetail>('/v1/members', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
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
