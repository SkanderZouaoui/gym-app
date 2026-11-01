import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { PaymentMethod } from '../lib/format'

export interface StatsOverview {
  attendance: { sessionsCount: number; totalCapacity: number; totalBooked: number; fillRate: number; attended: number; noShow: number; noShowRate: number }
  revenue: { total: number; byMethod: { method: PaymentMethod; amount: number; count: number }[] }
  newMembers: { total: number; byDay: { date: string; count: number }[] }
  retention: { cohortSize: number; retainedCount: number; retentionRate: number; churnRate: number }
}

export const useStatsOverview = (from: string, to: string) =>
  useQuery({ queryKey: ['admin', 'stats', 'overview', from, to], queryFn: async () => (await api.get<StatsOverview>('/v1/admin/stats/overview', { params: { from, to } })).data })

export interface ScanLog {
  id: string
  sessionId: string
  result: 'GRANTED' | 'DENIED'
  reasonCode: string
  offline: boolean
  scannedAt: string
  session: { startsAt: string; classType: { name: string } } | null
  user: { id: string; firstName: string; lastName: string } | null
}
export const useScanLogs = () => useQuery({ queryKey: ['admin', 'attendance', 'logs'], queryFn: async () => (await api.get<ScanLog[]>('/v1/admin/attendance/logs')).data })

/** Télécharge l'export CSV des encaissements de la période (le jeton d'accès est envoyé : pas de simple lien). */
export async function downloadPaymentsCsv(from: string, to: string) {
  const { data } = await api.get<Blob>('/v1/admin/stats/export/payments.csv', { params: { from, to }, responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = `encaissements-${from.slice(0, 10)}-${to.slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
