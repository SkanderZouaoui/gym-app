import type { Member } from '../api/types'
import type { Tone } from '../components/ui/Badge'
import { daysLeft } from './format'

export type MembershipState = 'active' | 'expiring' | 'expired' | 'none'

/** État d'un adhérent d'après son abonnement le plus récent (mêmes seuils que le mobile : « expire bientôt » ≤ 14 jours). */
export function membershipState(m: Pick<Member, 'memberships'>, now = Date.now()): MembershipState {
  const last = m.memberships?.[0]
  if (!last) return 'none'
  if (last.status === 'ACTIVE') return daysLeft(last.endDate, now) <= 14 ? 'expiring' : 'active'
  return 'expired'
}

export function membershipBadge(m: Pick<Member, 'memberships'>, now = Date.now()): { label: string; tone: Tone } {
  const last = m.memberships?.[0]
  switch (membershipState(m, now)) {
    case 'active':
      return { label: 'Actif', tone: 'success' }
    case 'expiring':
      return { label: 'Expire bientôt', tone: 'warning' }
    case 'none':
      return { label: 'Sans abonnement', tone: 'muted' }
    default:
      return last?.status === 'SUSPENDED' ? { label: 'Suspendu', tone: 'warning' } : { label: 'Expiré', tone: 'danger' }
  }
}

export function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export function durationLabel(days: number): string {
  if (days >= 360) return `${Math.round(days / 365)} an${days >= 540 ? 's' : ''}`
  if (days >= 28) return `${Math.round(days / 30)} mois`
  return `${days} jours`
}
