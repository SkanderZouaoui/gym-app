import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { useAuth, type Me } from '../store/auth'

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

const KEY = ['me', 'notifications']
export const useMyNotifications = () => useQuery({ queryKey: KEY, queryFn: async () => (await api.get<NotificationItem[]>('/v1/me/notifications')).data, refetchInterval: 60_000 })

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/v1/me/notifications/${id}/read`)).data,
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async () => (await api.patch('/v1/me/notifications/read-all')).data, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}
export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/me/notifications/${id}`)).data, onSettled: () => qc.invalidateQueries({ queryKey: KEY }) })
}

/** Met à jour le profil de la personne connectée (nom, téléphone, photo : `photoKey` null la supprime). */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (body: { firstName?: string; lastName?: string; phone?: string; photoKey?: string | null }) => (await api.patch<Me & { phone?: string | null }>('/v1/me', body)).data,
    onSuccess: (me) => useAuth.setState((s) => (s.user ? { user: { ...s.user, ...me } } : s)),
  })
}

export const useMyProfile = () => useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<Me & { phone: string | null }>('/v1/me')).data })

export async function uploadAvatar(file: File): Promise<string> {
  const { data } = await api.post<{ key: string; uploadUrl: string }>('/v1/me/avatar-upload-url', { contentType: file.type, sizeBytes: file.size })
  const put = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!put.ok) throw new Error('UPLOAD_FAILED')
  return data.key
}

export const changePassword = async (currentPassword: string, newPassword: string) => (await api.post('/v1/me/change-password', { currentPassword, newPassword })).data
