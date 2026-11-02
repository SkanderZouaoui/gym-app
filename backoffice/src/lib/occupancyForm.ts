import type { OccupancyPolicy } from '@muscleup/shared'
import type { OccupancySettings } from '../api/occupancy'

export interface OccupancyForm {
  publicIp: string
  wifiWeight: string
  otherNetworkWeight: string
  presenceWindowMinutes: string
  defaultDuration: string
  maxDuration: string
  visibleToMembers: boolean
}

export const formFrom = (d: OccupancySettings): OccupancyForm => ({
  publicIp: d.publicIp ?? '',
  wifiWeight: String(d.policy.wifiWeight),
  otherNetworkWeight: String(d.policy.otherNetworkWeight),
  presenceWindowMinutes: String(d.policy.presenceWindowMinutes),
  defaultDuration: String(d.policy.manualOverrideDefaultDurationMinutes),
  maxDuration: String(d.policy.manualOverrideMaxDurationMinutes),
  visibleToMembers: d.policy.visibleToMembers,
})

export const payloadFrom = (f: OccupancyForm): OccupancyPolicy & { publicIp: string | null } => ({
  wifiWeight: Number(f.wifiWeight),
  otherNetworkWeight: Number(f.otherNetworkWeight),
  presenceWindowMinutes: Number(f.presenceWindowMinutes),
  manualOverrideDefaultDurationMinutes: Number(f.defaultDuration),
  manualOverrideMaxDurationMinutes: Number(f.maxDuration),
  visibleToMembers: f.visibleToMembers,
  publicIp: f.publicIp.trim() || null,
})
