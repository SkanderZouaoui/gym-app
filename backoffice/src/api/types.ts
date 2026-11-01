import type { PaymentMethod } from '../lib/format'

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'

export interface Member {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  status: string
  memberCode?: string | null
  photoUrl?: string | null
  createdAt?: string
  memberships?: { status: MembershipStatus; endDate: string; plan: { name: string } }[]
}

export interface Membership {
  id: string
  planId: string
  startDate: string
  endDate: string
  status: MembershipStatus
  plan: { id: string; name: string; durationDays: number; price: string }
}

export interface Plan {
  id: string
  name: string
  description: string | null
  durationDays: number
  price: string
  isPopular: boolean
  isVisibleInApp: boolean
  includesLabel: string | null
}

export interface Payment {
  id: string
  amount: string
  method: PaymentMethod
  recordedAt: string
  reference: string | null
  membership: {
    id: string
    userId: string
    startDate: string
    endDate: string
    user: { firstName: string; lastName: string; photoUrl?: string | null }
    plan: { name: string }
  }
}

export interface SessionSummary {
  id: string
  startsAt: string
  endsAt: string
  capacity: number
  status: string
  classType: { id: string; name: string; description: string | null; level?: string | null }
  room: { id: string; name: string } | null
  coach: { user: { firstName: string; lastName: string } } | null
  coachId?: string | null
  roomId?: string | null
  _count: { bookings: number }
}

export interface RosterEntry {
  id: string
  status: 'CONFIRMED' | 'WAITLISTED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW'
  bookingCode: string
  attendedAt?: string | null
  user: { id: string; firstName: string; lastName: string; photoUrl?: string | null; phone?: string | null; memberCode?: string | null; memberships?: { status: MembershipStatus; endDate: string; plan: { name: string } }[] }
}

export interface StaffToday {
  sessions: { id: string; classTypeName: string; startsAt: string; endsAt: string; status: string; room?: string; coachName: string | null; capacity: number; booked: number; fillRate: number }[]
  attendedToday: number
}

export interface AdminDashboard {
  activeMembers: number
  attendanceToday: number
  revenueToday: string | number
  revenueMonth: string | number
  classesToday: number
  newMembersToday?: number
  paymentsToday?: number
  avgFillRate: number
  alerts: { expiringMemberships: number; underfilledClasses: number }
}
