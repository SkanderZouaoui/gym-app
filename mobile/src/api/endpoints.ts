import { apiRequest } from './client';
import type {
  Booking,
  Branch,
  ClassSessionSummary,
  MeResponse,
  MembershipSummary,
  PointsBalance,
  QrTokenResponse,
  TokenPair,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<TokenPair & { grants: unknown[] }>('/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    homeBranchId?: string;
    referralCode?: string;
  }) => apiRequest<TokenPair>('/v1/auth/register', { method: 'POST', body: data, auth: false }),
  logout: (refreshToken: string) =>
    apiRequest<void>('/v1/auth/logout', { method: 'POST', body: { refreshToken } }),
};

export const meApi = {
  getMe: () => apiRequest<MeResponse>('/v1/me'),
  getMemberships: () => apiRequest<MembershipSummary[]>('/v1/me/memberships'),
  getBookings: () => apiRequest<Booking[]>('/v1/me/bookings'),
  getQrToken: () => apiRequest<QrTokenResponse>('/v1/me/qr-token'),
  getPoints: () => apiRequest<PointsBalance>('/v1/me/points'),
  getStreak: () => apiRequest<{ streak: number }>('/v1/me/streak'),
};

export const branchesApi = {
  findAll: () => apiRequest<Branch[]>('/v1/branches'),
};

export const classesApi = {
  findSessions: (branchId: string, from?: string, to?: string) => {
    const params = new URLSearchParams({ branchId });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return apiRequest<ClassSessionSummary[]>(`/v1/classes/sessions?${params.toString()}`);
  },
  findSession: (id: string) => apiRequest<ClassSessionSummary>(`/v1/classes/sessions/${id}`),
};

export const bookingsApi = {
  create: (sessionId: string) =>
    apiRequest<Booking>('/v1/bookings', { method: 'POST', body: { sessionId } }),
  cancel: (id: string) => apiRequest<Booking>(`/v1/bookings/${id}`, { method: 'DELETE' }),
};
