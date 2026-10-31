import { describe, expect, it } from 'vitest';
import { formatClock, formatDurationLabel, workoutSeconds } from '../utils/duration';
import { normalizeImageType, MAX_UPLOAD_BYTES } from '../utils/upload';
import { estimateMinutes } from '../components/coach/programStatus';

describe('duration', () => {
  it('privilégie les secondes, replie sur les minutes', () => {
    expect(workoutSeconds({ durationSeconds: 125, durationMinutes: 2 })).toBe(125);
    expect(workoutSeconds({ durationSeconds: null, durationMinutes: 3 })).toBe(180);
    expect(workoutSeconds({})).toBeNull();
  });
  it('conserve 0 seconde (pas de repli)', () => {
    expect(workoutSeconds({ durationSeconds: 0, durationMinutes: 5 })).toBe(0);
  });
  it('formate le chrono, minutes au-delà de 59', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(2885)).toBe('48:05');
    expect(formatClock(3725)).toBe('62:05');
  });
  it('formate le libellé de durée', () => {
    expect(formatDurationLabel(2885)).toBe('48 min 05 s');
    expect(formatDurationLabel(1800)).toBe('30 min');
  });
});

describe('upload', () => {
  it('ramène image/jpg à image/jpeg et met en minuscules', () => {
    expect(normalizeImageType('image/jpg')).toBe('image/jpeg');
    expect(normalizeImageType('IMAGE/PNG')).toBe('image/png');
    expect(normalizeImageType(undefined)).toBe('image/jpeg');
    expect(normalizeImageType(null)).toBe('image/jpeg');
  });
  it('limite à 10 Mo, comme l’API', () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe('estimateMinutes', () => {
  it('compte ≈ 3,2 min par série', () => {
    expect(estimateMinutes(0)).toBe(0);
    expect(estimateMinutes(10)).toBe(32);
    expect(estimateMinutes(7)).toBe(22);
  });
});
