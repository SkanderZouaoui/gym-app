import type { Role } from '@muscleup/shared';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface BranchRoleGrant {
  role: Role;
  branchId: string | null;
}

export interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  photoUrl: string | null;
  homeBranchId: string | null;
  status: string;
  branchRoles: { role: Role; branchId: string | null }[];
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
}

export interface ClassSessionSummary {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: string;
  classType: { id: string; name: string; description: string | null };
  room: { id: string; name: string } | null;
  coach: { user: { firstName: string; lastName: string } } | null;
  _count: { bookings: number };
}

export interface ClassSessionDetail extends ClassSessionSummary {
  classType: { id: string; name: string; description: string | null };
  branch: { id: string; name: string; address: string | null };
}

export interface Booking {
  id: string;
  sessionId: string;
  userId: string;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  waitlistPosition: number | null;
  bookingCode: string;
  attendedAt: string | null;
  createdAt: string;
  session?: ClassSessionSummary;
}

export interface MembershipSummary {
  id: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  plan: { name: string; durationDays: number; price: string };
}

export interface QrTokenResponse {
  token: string;
  expiresInSeconds: number;
}

export interface PointsBalance {
  points: number;
}
