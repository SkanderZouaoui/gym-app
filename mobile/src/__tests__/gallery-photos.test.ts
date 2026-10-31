import { describe, expect, it } from 'vitest';
import { photosOf } from '../components/gallery/photos';

describe('photosOf', () => {
  it('associe miniature et blurhash par position', () => {
    expect(photosOf({ galleryUrls: ['a', 'b'], galleryThumbUrls: ['ta', 'tb'], galleryBlurhashes: ['ha', null] })).toEqual([
      { url: 'a', thumbUrl: 'ta', blurhash: 'ha' },
      { url: 'b', thumbUrl: 'tb', blurhash: null },
    ]);
  });
  it('anciennes photos : la miniature retombe sur l’original', () => {
    expect(photosOf({ galleryUrls: ['a'] })).toEqual([{ url: 'a', thumbUrl: 'a', blurhash: null }]);
  });
  it('sans galerie', () => {
    expect(photosOf(null)).toEqual([]);
    expect(photosOf({})).toEqual([]);
  });
});
