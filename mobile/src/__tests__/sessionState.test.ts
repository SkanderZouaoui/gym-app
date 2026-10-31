import { describe, expect, it } from 'vitest';
import { sessionState } from '../components/staff/sessionState';
import type { ClassSessionSummary } from '../api/types';

const NOW = new Date('2026-11-01T10:00:00Z').getTime();
const at = (offsetMin: number) => new Date(NOW + offsetMin * 60_000).toISOString();

function session(over: { start: number; end: number; booked?: number; capacity?: number; status?: string }) {
  return {
    status: over.status ?? 'SCHEDULED',
    startsAt: at(over.start),
    endsAt: at(over.end),
    capacity: over.capacity ?? 10,
    _count: { bookings: over.booked ?? 0 },
  } as unknown as ClassSessionSummary;
}

describe('sessionState', () => {
  it('terminé quand la fin est passée', () => {
    expect(sessionState(session({ start: -90, end: -30 }), NOW).key).toBe('done');
  });
  it('en cours entre le début et la fin', () => {
    expect(sessionState(session({ start: -10, end: 40 }), NOW).key).toBe('live');
    expect(sessionState(session({ start: 0, end: 45 }), NOW).key).toBe('live');
  });
  it('annulé prime sur tout', () => {
    expect(sessionState(session({ start: -10, end: 40, status: 'CANCELLED' }), NOW).key).toBe('cancelled');
    expect(sessionState(session({ start: 60, end: 100, status: 'CANCELLED', booked: 10 }), NOW).key).toBe('cancelled');
  });
  it('à venir : complet, presque plein, ouvert', () => {
    expect(sessionState(session({ start: 60, end: 100, booked: 10 }), NOW).key).toBe('full');
    expect(sessionState(session({ start: 60, end: 100, booked: 7 }), NOW).key).toBe('almost');
    expect(sessionState(session({ start: 60, end: 100, booked: 6 }), NOW).key).toBe('open');
  });
  it('taux de remplissage, capacité 0 sans division par zéro', () => {
    expect(sessionState(session({ start: 60, end: 100, booked: 5 }), NOW).ratio).toBe(0.5);
    expect(Number.isFinite(sessionState(session({ start: 60, end: 100, booked: 1, capacity: 0 }), NOW).ratio)).toBe(true);
  });
});
