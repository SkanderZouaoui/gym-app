import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import type { MeResponse } from '../api/types';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoKey?: string;
  homeBranchId?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateProfileInput) => apiRequest<MeResponse>('/v1/me', { method: 'PATCH', body: dto }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

/** Demande une URL présignée pour envoyer une nouvelle photo de profil
 * directement au stockage objet (même mécanisme que les photos de
 * progression) — la clé obtenue est ensuite confirmée via useUpdateProfile. */
export function useRequestAvatarUploadUrl() {
  return useMutation({
    mutationFn: (contentType: string) =>
      apiRequest<{ key: string; uploadUrl: string }>('/v1/me/avatar-upload-url', {
        method: 'POST',
        body: { contentType },
      }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['me', 'notifications'],
    queryFn: () => apiRequest<NotificationItem[]>('/v1/me/notifications'),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/me/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/v1/me/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (password: string) => apiRequest<void>('/v1/me', { method: 'DELETE', body: { password } }),
  });
}

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (input: { newEmail: string; password: string }) =>
      apiRequest<void>('/v1/me/email/request-otp', { method: 'POST', body: input }),
  });
}

export function useConfirmEmailChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      apiRequest<MeResponse>('/v1/me/email/confirm', { method: 'POST', body: { code } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiRequest<void>('/v1/me/change-password', { method: 'POST', body: input }),
  });
}
