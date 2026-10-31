import { describe, expect, it } from 'vitest';
import { blurhashAverageColor, blurhashRgba } from '../utils/blurhash';

// Hashes réels générés par l'API (sharp + blurhash) pour des images unies.
const RED = 'L5M^z||wfQ|w|wo1fQo1fQfQfQfQ'; // rgb(200,30,30)
const BLUE = 'L62S#mk]fQk]k]flfQflfQfQfQfQ'; // rgb(20,120,220)

describe('blurhashAverageColor', () => {
  it('retrouve la couleur d’une image unie (à 1 niveau près)', () => {
    const red = blurhashAverageColor(RED)!;
    expect(Math.abs(red.r - 200)).toBeLessThanOrEqual(1);
    expect(Math.abs(red.g - 30)).toBeLessThanOrEqual(1);
    expect(Math.abs(red.b - 30)).toBeLessThanOrEqual(1);
    const blue = blurhashAverageColor(BLUE)!;
    expect(Math.abs(blue.b - 220)).toBeLessThanOrEqual(1);
    expect(Math.abs(blue.g - 120)).toBeLessThanOrEqual(1);
  });
  it('renvoie null pour une valeur absente ou invalide', () => {
    expect(blurhashAverageColor(null)).toBeNull();
    expect(blurhashAverageColor('')).toBeNull();
    expect(blurhashAverageColor('abc')).toBeNull();
    expect(blurhashAverageColor('L5 éééééé')).toBeNull();
  });
  it('rgba avec repli', () => {
    expect(blurhashRgba(RED, 0.5, 'x')).toMatch(/^rgba\(\d+,\d+,\d+,0.5\)$/);
    expect(blurhashRgba(null, 0.5, 'transparent')).toBe('transparent');
  });
});
