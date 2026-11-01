import { describe, expect, it } from 'vitest';
import { shiftBar, shiftDayIndex, shiftStatus, weekHours, type Shift } from '../utils/workShift';

const day = (over: Partial<Shift> = {}): Shift => ({ dayOfWeek: 0, working: true, startTime: '08:00', endTime: '16:00', ...over });
const at = (h: number, m = 0) => new Date(2026, 10, 2, h, m); // lundi

describe('shiftStatus', () => {
  it('pas encore commencé, en poste, terminé', () => {
    expect(shiftStatus(day(), at(7, 59))).toEqual({ kind: 'before', startsAt: '08:00' });
    expect(shiftStatus(day(), at(8, 0))).toEqual({ kind: 'on', endsAt: '16:00' });
    expect(shiftStatus(day(), at(15, 59))).toEqual({ kind: 'on', endsAt: '16:00' });
    expect(shiftStatus(day(), at(16, 0))).toEqual({ kind: 'done' });
  });
  it('repos ou créneau incohérent', () => {
    expect(shiftStatus(day({ working: false }), at(10))).toEqual({ kind: 'off' });
    expect(shiftStatus(day({ startTime: '16:00', endTime: '08:00' }), at(10))).toEqual({ kind: 'off' });
    expect(shiftStatus(undefined, at(10))).toEqual({ kind: 'off' });
  });
});

describe('shiftDayIndex', () => {
  it('lundi = 0 … dimanche = 6', () => {
    expect(shiftDayIndex(at(12))).toBe(0);
    expect(shiftDayIndex(new Date(2026, 10, 8, 12))).toBe(6);
  });
});

describe('shiftBar', () => {
  it('position dans la fenêtre 06:00–24:00', () => {
    const bar = shiftBar(day({ startTime: '06:00', endTime: '15:00' }))!;
    expect(bar.from).toBe(0);
    expect(bar.to).toBeCloseTo(0.5);
  });
  it('borne les créneaux hors fenêtre, null pour un repos', () => {
    const bar = shiftBar(day({ startTime: '04:00', endTime: '23:59' }))!;
    expect(bar.from).toBe(0);
    expect(bar.to).toBeLessThanOrEqual(1);
    expect(shiftBar(day({ working: false }))).toBeNull();
  });
});

describe('weekHours', () => {
  it('somme des jours travaillés, arrondie au dixième', () => {
    expect(weekHours([day(), day({ startTime: '09:00', endTime: '17:30' }), day({ working: false })])).toBe(16.5);
    expect(weekHours([])).toBe(0);
  });
});
