import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

const get = async <T>(url: string, params?: Record<string, unknown>) => (await api.get<T>(url, { params })).data

export interface GalleryFields {
  galleryKeys: string[]
  galleryUrls: string[]
  galleryThumbUrls?: string[]
}
export interface ClassType extends GalleryFields {
  id: string
  name: string
  defaultCapacity: number
  defaultDurationMin: number
  isActive: boolean
  level?: string | null
}
export interface Room extends GalleryFields {
  id: string
  name: string
  capacity: number
}
export interface Coach {
  userId: string
  user: { firstName: string; lastName: string }
}

export const useClassTypes = () => useQuery({ queryKey: ['admin', 'class-types'], queryFn: () => get<ClassType[]>('/v1/admin/class-types') })
export const useRooms = () => useQuery({ queryKey: ['admin', 'rooms'], queryFn: () => get<Room[]>('/v1/admin/rooms') })
export const useCoaches = () => useQuery({ queryKey: ['admin', 'coaches'], queryFn: () => get<Coach[]>('/v1/admin/coaches'), staleTime: 5 * 60_000 })

function useInvalidateCatalog() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'class-types'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'rooms'] })
    void qc.invalidateQueries({ queryKey: ['sessions'] })
  }
}

export function useSaveClassType() {
  const done = useInvalidateCatalog()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id?: string; name: string; defaultCapacity?: number; defaultDurationMin?: number; isActive?: boolean }) =>
      (await (id ? api.patch<ClassType>(`/v1/admin/class-types/${id}`, body) : api.post<ClassType>('/v1/admin/class-types', body))).data,
    onSuccess: done,
  })
}
export function useDeleteClassType() {
  const done = useInvalidateCatalog()
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<{ deleted: boolean; deactivated: boolean }>(`/v1/admin/class-types/${id}`)).data,
    onSuccess: done,
  })
}
export function useSaveRoom() {
  const done = useInvalidateCatalog()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id?: string; name: string; capacity: number }) =>
      (await (id ? api.patch<Room>(`/v1/admin/rooms/${id}`, body) : api.post<Room>('/v1/admin/rooms', body))).data,
    onSuccess: done,
  })
}
export function useDeleteRoom() {
  const done = useInvalidateCatalog()
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/admin/rooms/${id}`)).data, onSuccess: done })
}

export type GalleryKind = 'class-types' | 'rooms'

/** Galerie photos d'un type de cours ou d'une salle : envoi direct au stockage (URL présignée), puis rattachement. */
export function useGalleryApi(kind: GalleryKind, id: string) {
  const done = useInvalidateCatalog()
  const base = `/v1/admin/${kind}/${id}`
  return {
    async upload(file: File): Promise<GalleryFields> {
      const { data } = await api.post<{ key: string; uploadUrl: string }>(`${base}/gallery/upload-url`, { contentType: file.type, sizeBytes: file.size })
      const put = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!put.ok) throw new Error('UPLOAD_FAILED')
      const res = (await api.post<GalleryFields>(`${base}/gallery`, { key: data.key })).data
      done()
      return res
    },
    async remove(key: string): Promise<GalleryFields> {
      const res = (await api.delete<GalleryFields>(`${base}/gallery`, { data: { key } })).data
      done()
      return res
    },
    async reorder(keys: string[]): Promise<GalleryFields> {
      const res = (await api.put<GalleryFields>(`${base}/gallery/order`, { keys })).data
      done()
      return res
    },
  }
}

// --- Cours (séances) -----------------------------------------------------------

export interface SessionInput {
  classTypeId: string
  startsAt: string
  durationMin?: number
  coachId: string | null
  roomId: string | null
  capacity: number
}

function useInvalidateSessions() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['sessions'] })
    void qc.invalidateQueries({ queryKey: ['staff'] })
    void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }
}

export function useSaveSession() {
  const done = useInvalidateSessions()
  return useMutation({
    mutationFn: async ({ id, ...body }: SessionInput & { id?: string }) => (await api.request({ url: id ? `/v1/admin/sessions/${id}` : '/v1/admin/sessions', method: id ? 'PATCH' : 'POST', data: body })).data,
    onSuccess: done,
  })
}
export function useCancelSession() {
  const done = useInvalidateSessions()
  return useMutation({ mutationFn: async (id: string) => (await api.post(`/v1/admin/sessions/${id}/cancel`, {})).data, onSuccess: done })
}
export function useDeleteSession() {
  const done = useInvalidateSessions()
  return useMutation({ mutationFn: async (id: string) => (await api.delete(`/v1/admin/sessions/${id}`)).data, onSuccess: done })
}
