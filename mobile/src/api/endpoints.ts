import { apiRequest } from './client';
import type {
  Booking,
  ClassSessionDetail,
  ClassSessionSummary,
  MeResponse,
  MembershipSummary,
  QrTokenResponse,
  TokenPair,
} from './types';
import type { AppConfigContent, Role } from '@muscleup/shared';
import { mailLang } from '../utils/otpErrors';

export const configApi = {
  /** Configuration publiée (branding, accueil, navigation, textes, règles) —
   * lue au démarrage, sans authentification nécessaire. */
  getConfig: () =>
    apiRequest<AppConfigContent & { version: number; publishedAt: string | null }>('/v1/config', {
      auth: false,
    }),
};

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<TokenPair & { roles: Role[] }>('/v1/auth/login', {
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
  }) => apiRequest<TokenPair>('/v1/auth/register', { method: 'POST', body: data, auth: false }),
  logout: (refreshToken: string) =>
    apiRequest<void>('/v1/auth/logout', { method: 'POST', body: { refreshToken } }),
  forgotPassword: (email: string) =>
    apiRequest<void>('/v1/auth/forgot-password', { method: 'POST', body: { email, lang: mailLang() }, auth: false }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    apiRequest<void>('/v1/auth/reset-password', {
      method: 'POST',
      body: { email, code, newPassword },
      auth: false,
    }),
};

export const meApi = {
  getMe: () => apiRequest<MeResponse>('/v1/me'),
  completeOnboarding: (body: OnboardingInput) => apiRequest<MeResponse>('/v1/me/onboarding', { method: 'POST', body }),
  getMemberships: () => apiRequest<MembershipSummary[]>('/v1/me/memberships'),
  getBookings: () => apiRequest<Booking[]>('/v1/me/bookings'),
  getQrToken: () => apiRequest<QrTokenResponse>('/v1/me/qr-token'),
  getOfflineQrToken: () => apiRequest<QrTokenResponse>('/v1/me/qr-token/offline'),
};

export const classesApi = {
  findSessions: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return apiRequest<ClassSessionSummary[]>(`/v1/classes/sessions${query ? `?${query}` : ''}`);
  },
  findSession: (id: string) => apiRequest<ClassSessionDetail>(`/v1/classes/sessions/${id}`),
};

export const bookingsApi = {
  create: (sessionId: string) =>
    apiRequest<Booking>('/v1/bookings', { method: 'POST', body: { sessionId } }),
  cancel: (id: string) => apiRequest<Booking>(`/v1/bookings/${id}`, { method: 'DELETE' }),
};

export interface OnboardingInput {
  goal: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  age: number;
  level: string;
  sessionsPerWeek: string;
}
