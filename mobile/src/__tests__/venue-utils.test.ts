import { describe, expect, it } from 'vitest';
import { hoursLabel, openMinutes, venueStatus, weekdayIndex, type DayHours } from '../utils/openingHours';
import { directionsUrl, parseMapsLocation, tilesAround, worldPixel } from '../utils/maps';

// lundi → dimanche
const week: DayHours[] = [
  { open: true, from: '07:00', to: '22:00' },
  { open: true, from: '07:00', to: '22:00' },
  { open: true, from: '07:00', to: '22:00' },
  { open: true, from: '07:00', to: '22:00' },
  { open: true, from: '07:00', to: '22:00' },
  { open: true, from: '08:00', to: '20:00' },
  { open: false, from: '07:00', to: '22:00' },
];
// 2026-11-02 est un lundi
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m);

describe('weekdayIndex', () => {
  it('lundi = 0 … dimanche = 6', () => {
    expect(weekdayIndex(at(2, 12))).toBe(0);
    expect(weekdayIndex(at(8, 12))).toBe(6);
  });
});

describe('venueStatus', () => {
  it('ouverte pendant le créneau, jusqu’à l’heure de fermeture', () => {
    expect(venueStatus(week, at(2, 10))).toEqual({ kind: 'open', closesAt: '22:00' });
    expect(venueStatus(week, at(2, 7, 0))).toEqual({ kind: 'open', closesAt: '22:00' });
  });
  it('fermée à l’heure de fermeture exacte', () => {
    expect(venueStatus(week, at(2, 22, 0))).toMatchObject({ kind: 'closed', daysAhead: 1, opensAt: '07:00', weekday: 1 });
  });
  it('avant l’ouverture : rouvre plus tard aujourd’hui', () => {
    expect(venueStatus(week, at(2, 5, 30))).toEqual({ kind: 'closed', opensAt: '07:00', daysAhead: 0, weekday: 0 });
  });
  it('samedi soir : le dimanche est fermé, rouvre lundi', () => {
    expect(venueStatus(week, at(7, 21))).toEqual({ kind: 'closed', opensAt: '07:00', daysAhead: 2, weekday: 0 });
  });
  it('dimanche (fermé) : rouvre demain', () => {
    expect(venueStatus(week, at(8, 12))).toEqual({ kind: 'closed', opensAt: '07:00', daysAhead: 1, weekday: 0 });
  });
  it('fermée toute la semaine', () => {
    expect(venueStatus(week.map((d) => ({ ...d, open: false })), at(2, 10))).toEqual({ kind: 'closedAllWeek' });
  });
  it('créneau incohérent (fin avant début) ignoré', () => {
    const bad = week.map((d, i) => (i === 0 ? { open: true, from: '22:00', to: '06:00' } : d));
    expect(venueStatus(bad, at(2, 23)).kind).toBe('closed');
  });
});

describe('hoursLabel', () => {
  it('créneau du jour, ou null si fermé', () => {
    expect(hoursLabel(week, at(2, 9))).toBe('07:00–22:00');
    expect(hoursLabel(week, at(7, 9))).toBe('08:00–20:00');
    expect(hoursLabel(week, at(8, 9))).toBeNull();
  });
});

describe('openMinutes', () => {
  it('durée du créneau, 0 si fermé ou incohérent', () => {
    expect(openMinutes(week[0])).toBe(15 * 60);
    expect(openMinutes(week[5])).toBe(12 * 60);
    expect(openMinutes(week[6])).toBe(0);
    expect(openMinutes({ open: true, from: '22:00', to: '06:00' })).toBe(0);
    expect(openMinutes({ open: true, from: '07:30', to: '12:00' })).toBe(270);
    expect(openMinutes(undefined)).toBe(0);
  });
});

describe('parseMapsLocation', () => {
  const tunis = { latitude: 36.8065, longitude: 10.1815 };
  it.each([
    ['lien avec @', 'https://www.google.com/maps/place/Tunis/@36.8065,10.1815,15z/data=!3m1'],
    ['lien avec !3d!4d', 'https://www.google.com/maps/place/x/data=!4m2!3m1!1s0x0:0x0!3d36.8065!4d10.1815'],
    ['paramètre q', 'https://maps.google.com/?q=36.8065,10.1815'],
    ['paramètre q encodé', 'https://maps.google.com/?q=36.8065%2C10.1815'],
    ['coordonnées brutes', '36.8065, 10.1815'],
    ['coordonnées avec espace', ' 36.8065 10.1815 '],
  ])('%s', (_label, text) => {
    expect(parseMapsLocation(text)).toEqual(tunis);
  });
  it('hémisphères négatifs', () => {
    expect(parseMapsLocation('-33.86, 151.21')).toEqual({ latitude: -33.86, longitude: 151.21 });
  });
  it('refuse le texte sans position, les liens courts et les valeurs hors limites', () => {
    expect(parseMapsLocation('Bizerte Nord')).toBeNull();
    expect(parseMapsLocation('https://maps.app.goo.gl/AbCdEf')).toBeNull();
    expect(parseMapsLocation('120.5, 10.1')).toBeNull();
    expect(parseMapsLocation('')).toBeNull();
  });
});

describe('directionsUrl', () => {
  it('privilégie la position, sinon l’adresse encodée', () => {
    expect(directionsUrl({ latitude: 36.8, longitude: 10.18, address: 'x' })).toBe('https://www.google.com/maps/dir/?api=1&destination=36.8%2C10.18');
    expect(directionsUrl({ address: '12 rue du Sport, Tunis' })).toBe('https://www.google.com/maps/dir/?api=1&destination=12%20rue%20du%20Sport%2C%20Tunis');
    expect(directionsUrl({ latitude: null, longitude: null, address: '  ' })).toBeNull();
  });
});

describe('tuiles de carte', () => {
  it('l’équateur / méridien 0 est au centre du monde', () => {
    expect(worldPixel({ latitude: 0, longitude: 0 }, 1)).toEqual({ x: 256, y: 256 });
  });
  it('les tuiles couvrent la vignette entière, centrée sur la position', () => {
    const tiles = tilesAround({ latitude: 36.8065, longitude: 10.1815 }, 16, 340, 180);
    const minLeft = Math.min(...tiles.map((t) => t.left));
    const maxRight = Math.max(...tiles.map((t) => t.left + 256));
    const minTop = Math.min(...tiles.map((t) => t.top));
    const maxBottom = Math.max(...tiles.map((t) => t.top + 256));
    expect(minLeft).toBeLessThanOrEqual(0);
    expect(maxRight).toBeGreaterThanOrEqual(340);
    expect(minTop).toBeLessThanOrEqual(0);
    expect(maxBottom).toBeGreaterThanOrEqual(180);
    expect(tiles.length).toBeLessThanOrEqual(6);
    expect(new Set(tiles.map((t) => `${t.x}/${t.y}`)).size).toBe(tiles.length);
  });
});
