import { describe, expect, it } from 'vitest'
import { membershipBadge, membershipState, durationLabel, generatePassword } from '../lib/membership'
import { sessionState } from '../lib/sessions'
import { daysLeft, formatMoney, greeting, sameDay } from '../lib/format'

const NOW = new Date('2026-11-01T10:00:00Z').getTime()
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString()
const m = (status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED', end: string) => ({ memberships: [{ status, endDate: end, plan: { name: 'Gym' } }] })

describe('membershipState / membershipBadge', () => {
  it('actif, expire bientôt (≤ 14 jours), expiré, suspendu, sans abonnement', () => {
    expect(membershipState(m('ACTIVE', inDays(60)), NOW)).toBe('active')
    expect(membershipState(m('ACTIVE', inDays(14)), NOW)).toBe('expiring')
    expect(membershipState(m('ACTIVE', inDays(15)), NOW)).toBe('active')
    expect(membershipState(m('EXPIRED', inDays(-3)), NOW)).toBe('expired')
    expect(membershipState({}, NOW)).toBe('none')
    expect(membershipBadge(m('SUSPENDED', inDays(30)), NOW)).toEqual({ label: 'Suspendu', tone: 'warning' })
    expect(membershipBadge(m('EXPIRED', inDays(-1)), NOW)).toEqual({ label: 'Expiré', tone: 'danger' })
    expect(membershipBadge({}, NOW)).toEqual({ label: 'Sans abonnement', tone: 'muted' })
  })
})

describe('sessionState', () => {
  const s = (startMin: number, endMin: number, booked: number, capacity = 10, status = 'SCHEDULED') => ({
    startsAt: new Date(NOW + startMin * 60_000).toISOString(),
    endsAt: new Date(NOW + endMin * 60_000).toISOString(),
    capacity,
    status,
    _count: { bookings: booked },
  })
  it('suit les mêmes règles que le planning mobile', () => {
    expect(sessionState(s(-90, -30, 3), NOW).key).toBe('done')
    expect(sessionState(s(-10, 40, 3), NOW).key).toBe('live')
    expect(sessionState(s(60, 100, 10), NOW).key).toBe('full')
    expect(sessionState(s(60, 100, 7), NOW).key).toBe('almost')
    expect(sessionState(s(60, 100, 6), NOW).key).toBe('open')
    expect(sessionState(s(60, 100, 10, 10, 'CANCELLED'), NOW).key).toBe('cancelled')
    expect(Number.isFinite(sessionState(s(60, 100, 1, 0), NOW).ratio)).toBe(true)
  })
})

describe('format', () => {
  it('jours restants, jour identique, salutation, montants', () => {
    expect(daysLeft(inDays(10), NOW)).toBe(10)
    expect(sameDay(new Date(2026, 10, 1, 8), new Date(2026, 10, 1, 23))).toBe(true)
    expect(greeting(new Date(2026, 10, 1, 9))).toBe('Bonjour')
    expect(greeting(new Date(2026, 10, 1, 20))).toBe('Bonsoir')
    expect(formatMoney('900')).toContain('DT')
  })
  it('durée d’une formule', () => {
    expect(durationLabel(30)).toBe('1 mois')
    expect(durationLabel(90)).toBe('3 mois')
    expect(durationLabel(365)).toBe('1 an')
    expect(durationLabel(7)).toBe('7 jours')
  })
  it('mot de passe provisoire : 10 caractères sans ambiguïté', () => {
    const p = generatePassword()
    expect(p).toHaveLength(10)
    expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/)
    expect(generatePassword()).not.toBe(p)
  })
})
