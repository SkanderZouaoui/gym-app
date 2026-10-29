import type { Role } from '@muscleup/shared';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  photoUrl: string | null;
  status: string;
  roles: { role: Role }[];
  /** Code personnel à 6 chiffres : pointage manuel à l'accueil. */
  memberCode?: string | null;
  /** Mot de passe provisoire : le changement est obligatoire avant d'utiliser l'app. */
  mustChangePassword?: boolean;
  /** Spécialités du coach (vide pour un adhérent). */
  specialties?: string[];
}

export interface ClassSessionSummary {
  id: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: string;
  classType: { id: string; name: string; description: string | null; level?: string | null; galleryUrls?: string[] };
  room: { id: string; name: string } | null;
  coach: { user: { firstName: string; lastName: string } } | null;
  coachId?: string | null;
  roomId?: string | null;
  _count: { bookings: number };
}

export interface ClassSessionDetail extends ClassSessionSummary {
  classType: { id: string; name: string; description: string | null; level?: string | null; galleryUrls?: string[] };
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
