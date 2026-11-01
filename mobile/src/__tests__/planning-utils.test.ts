import { describe, expect, it } from 'vitest';
import { fillPercent, groupByPeriod, nowMarkerIndex, periodOf } from '../utils/planning';

const at = (h: number, m = 0) => new Date(2026, 10, 2, h, m).toISOString();
const s = (startH: number, endH: number) => ({ startsAt: at(startH), endsAt: at(endH) });
const ms = (h: number, m = 0) => new Date(2026, 10, 2, h, m).getTime();

describe('periodOf', () => {
  it('matin / après-midi / soir', () => {
    expect(periodOf(new Date(2026, 10, 2, 7))).toBe('morning');
    expect(periodOf(new Date(2026, 10, 2, 11, 59))).toBe('morning');
    expect(periodOf(new Date(2026, 10, 2, 12))).toBe('afternoon');
    expect(periodOf(new Date(2026, 10, 2, 17, 59))).toBe('afternoon');
    expect(periodOf(new Date(2026, 10, 2, 18))).toBe('evening');
  });
});

describe('groupByPeriod', () => {
  it('garde l’ordre et omet les périodes vides', () => {
    const groups = groupByPeriod([s(8, 9), s(10, 11), s(19, 20)]);
    expect(groups.map((g) => [g.period, g.items.length])).toEqual([['morning', 2], ['evening', 1]]);
    expect(groupByPeriod([])).toEqual([]);
  });
});

describe('nowMarkerIndex', () => {
  const day = [s(8, 9), s(12, 13), s(18, 19)];
  it('avant le premier cours', () => expect(nowMarkerIndex(day, ms(6))).toBe(0));
  it('entre deux cours', () => expect(nowMarkerIndex(day, ms(10))).toBe(1));
  it('après le dernier cours', () => expect(nowMarkerIndex(day, ms(21))).toBe(3));
  it('aucun repère pendant un cours', () => {
    expect(nowMarkerIndex(day, ms(12, 30))).toBeNull();
    expect(nowMarkerIndex(day, ms(8))).toBeNull();
  });
  it('fin de cours exclue', () => expect(nowMarkerIndex(day, ms(9))).toBe(1));
  it('journée vide', () => expect(nowMarkerIndex([], ms(10))).toBeNull());
});

describe('fillPercent', () => {
  it('taux global arrondi', () => {
    expect(fillPercent([{ capacity: 10, booked: 5 }, { capacity: 10, booked: 10 }])).toBe(75);
    expect(fillPercent([{ capacity: 3, booked: 1 }])).toBe(33);
    expect(fillPercent([])).toBe(0);
    expect(fillPercent([{ capacity: 0, booked: 0 }])).toBe(0);
  });
});
