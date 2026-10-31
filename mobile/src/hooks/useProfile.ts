import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';
import type { MeResponse } from '../api/types';
import { mailLang } from '../utils/otpErrors';

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
  /** Clé de la nouvelle photo ; `null` supprime la photo de profil. */
  photoKey?: string | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['updateProfile'],
    mutationFn: (dto: UpdateProfileInput) => apiRequest<MeResponse>('/v1/me', { method: 'PATCH', body: dto }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

/** Zone conservée par le recadrage, en fractions (0–1) de la largeur / hauteur de la photo actuelle. */
export interface AvatarCropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Recadre la photo de profil actuelle (traitement côté serveur : carré 512×512). */
export function useCropAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rect: AvatarCropRect) => apiRequest<MeResponse>('/v1/me/avatar/crop', { method: 'POST', body: rect }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

/** Demande une URL présignée pour envoyer une nouvelle photo de profil
 * directement au stockage objet (même mécanisme que les photos de
 * progression) — la clé obtenue est ensuite confirmée via useUpdateProfile. */
export function useRequestAvatarUploadUrl() {
  return useMutation({
    mutationFn: (input: { contentType: string; sizeBytes: number }) =>
      apiRequest<{ key: string; uploadUrl: string }>('/v1/me/avatar-upload-url', {
        method: 'POST',
        body: input,
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
    mutationKey: ['markNotificationRead'],
    mutationFn: (id: string) => apiRequest(`/v1/me/notifications/${id}/read`, { method: 'PATCH' }),
    onMutate: (id: string) => {
      queryClient.setQueryData<NotificationItem[]>(['me', 'notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}

/** Suppression d'une notification (balayage) : retirée de la liste tout de suite. */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['deleteNotification'],
    mutationFn: (id: string) => apiRequest(`/v1/me/notifications/${id}`, { method: 'DELETE' }),
    onMutate: (id: string) => {
      queryClient.setQueryData<NotificationItem[]>(['me', 'notifications'], (old) => old?.filter((n) => n.id !== id));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['markAllNotificationsRead'],
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
      apiRequest<void>('/v1/me/email/request-otp', { method: 'POST', body: { ...input, lang: mailLang() } }),
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
    mutationKey: ['changePassword'],
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiRequest<void>('/v1/me/change-password', { method: 'POST', body: input }),
  });
}
