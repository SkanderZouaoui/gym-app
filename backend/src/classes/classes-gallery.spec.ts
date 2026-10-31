import { describe, expect, it } from 'vitest';
import { assertSamePermutation, assertSessionEditable } from './classes.service.js';

describe('assertSamePermutation (réordonnancement des photos)', () => {
  const current = ['a', 'b', 'c'];

  it('accepte toute permutation des mêmes clés', () => {
    expect(() => assertSamePermutation(current, ['c', 'a', 'b'])).not.toThrow();
    expect(() => assertSamePermutation(current, ['a', 'b', 'c'])).not.toThrow();
  });

  it.each([
    ['clé en moins', ['a', 'b']],
    ['clé en plus', ['a', 'b', 'c', 'd']],
    ['clé inconnue', ['a', 'b', 'x']],
    ['doublon', ['a', 'a', 'b']],
    ['vide', []],
  ])('refuse %s', (_label, next) => {
    expect(() => assertSamePermutation(current, next as string[])).toThrowError(/INVALID_GALLERY_ORDER/);
  });
});

describe('assertSessionEditable (cours passé ou en cours)', () => {
  const now = Date.UTC(2026, 9, 31, 12, 0);
  const at = (ms: number) => ({ startsAt: new Date(ms) });

  it('autorise un cours qui n\'a pas encore commencé', () => {
    expect(() => assertSessionEditable(at(now + 60_000), now)).not.toThrow();
  });

  it.each([
    ['en cours (début atteint)', now],
    ['commencé depuis 10 min', now - 600_000],
    ['passé (hier)', now - 86_400_000],
  ])('refuse un cours %s', (_label, start) => {
    expect(() => assertSessionEditable(at(start), now)).toThrowError(/SESSION_NOT_EDITABLE/);
  });
});
