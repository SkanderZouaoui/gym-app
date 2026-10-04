/** Noms et payloads des événements internes (section 9.2). */
export const AppEvent = {
  BOOKING_ATTENDED: 'booking.attended',
  BOOKING_NO_SHOW: 'booking.no_show',
  MEMBERSHIP_EXPIRING: 'membership.expiring',
  USER_REGISTERED: 'user.registered',
} as const;

export interface UserRegisteredEvent {
  userId: string;
  referralCode?: string;
}

export interface BookingAttendedEvent {
  bookingId: string;
  userId: string;
  sessionId: string;
}

export interface BookingNoShowEvent {
  bookingId: string;
  userId: string;
}
