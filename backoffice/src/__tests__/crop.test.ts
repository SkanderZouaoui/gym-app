import { describe, expect, it } from 'vitest';
import { boxForRatio, boxToPixels, containSize, moveBox, resizeCorner } from '../lib/crop';

const bounds = { w: 400, h: 300 };

describe('containSize', () => {
  it('contient sans déformer', () => {
    expect(containSize({ w: 4000, h: 3000 }, { w: 400, h: 600 })).toEqual({ w: 400, h: 300 });
    expect(containSize({ w: 1000, h: 3000 }, { w: 400, h: 300 })).toEqual({ w: 100, h: 300 });
  });
});

describe('boxForRatio', () => {
  it('libre : toute l’image', () => {
    expect(boxForRatio(bounds, null)).toEqual({ x: 0, y: 0, w: 400, h: 300 });
  });
  it('carré centré', () => {
    expect(boxForRatio(bounds, 1)).toEqual({ x: 50, y: 0, w: 300, h: 300 });
  });
  it('16:10 plus large que l’image : pleine largeur, centré en hauteur', () => {
    const b = boxForRatio(bounds, 16 / 10);
    expect(b.w).toBe(400);
    expect(b.h).toBeCloseTo(250);
    expect(b.y).toBeCloseTo(25);
  });
});

describe('moveBox', () => {
  it('ne sort jamais de l’image', () => {
    const box = { x: 10, y: 10, w: 100, h: 100 };
    expect(moveBox(box, -50, -50, bounds)).toMatchObject({ x: 0, y: 0 });
    expect(moveBox(box, 999, 999, bounds)).toMatchObject({ x: 300, y: 200 });
    expect(moveBox(box, 20, 30, bounds)).toMatchObject({ x: 30, y: 40, w: 100, h: 100 });
  });
});

describe('resizeCorner', () => {
  const start = { x: 100, y: 100, w: 100, h: 100 };

  it('libre : le coin opposé reste fixe', () => {
    expect(resizeCorner(start, 'br', 50, 20, bounds, null, 40)).toEqual({ x: 100, y: 100, w: 150, h: 120 });
    expect(resizeCorner(start, 'tl', -30, -10, bounds, null, 40)).toEqual({ x: 70, y: 90, w: 130, h: 110 });
  });
  it('libre : taille minimale et limites de l’image', () => {
    const tiny = resizeCorner(start, 'br', -90, -90, bounds, null, 40);
    expect(tiny.w).toBe(40);
    expect(tiny.h).toBe(40);
    const big = resizeCorner(start, 'br', 999, 999, bounds, null, 40);
    expect(big).toEqual({ x: 100, y: 100, w: 300, h: 200 });
  });
  it('proportions verrouillées', () => {
    const r = resizeCorner(start, 'br', 100, 0, bounds, 2, 40);
    expect(r.w / r.h).toBeCloseTo(2);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);
    expect(r.x + r.w).toBeLessThanOrEqual(400);
    expect(r.y + r.h).toBeLessThanOrEqual(300);
  });
  it('proportions verrouillées : reste dans l’image même en tirant très loin', () => {
    for (const corner of ['tl', 'tr', 'bl', 'br'] as const) {
      const r = resizeCorner({ x: 150, y: 100, w: 100, h: 100 }, corner, 999, -999, bounds, 4 / 3, 40);
      expect(r.w / r.h).toBeCloseTo(4 / 3);
      expect(r.x).toBeGreaterThanOrEqual(-0.001);
      expect(r.y).toBeGreaterThanOrEqual(-0.001);
      expect(r.x + r.w).toBeLessThanOrEqual(400.001);
      expect(r.y + r.h).toBeLessThanOrEqual(300.001);
    }
  });
});

describe('boxToPixels', () => {
  it('convertit vers les pixels de l’image d’origine', () => {
    expect(boxToPixels({ x: 100, y: 75, w: 200, h: 150 }, bounds, { w: 4000, h: 3000 })).toEqual({ originX: 1000, originY: 750, width: 2000, height: 1500 });
  });
  it('reste dans l’image malgré les arrondis', () => {
    const r = boxToPixels({ x: 399.9, y: 299.9, w: 50, h: 50 }, bounds, { w: 4000, h: 3000 });
    expect(r.originX + r.width).toBeLessThanOrEqual(4000);
    expect(r.originY + r.height).toBeLessThanOrEqual(3000);
    expect(r.width).toBeGreaterThanOrEqual(1);
  });
});
