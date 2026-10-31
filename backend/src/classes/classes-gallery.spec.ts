import { describe, expect, it } from 'vitest';
import { assertSamePermutation } from './classes.service.js';

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
