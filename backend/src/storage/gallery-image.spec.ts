import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processGalleryImage, thumbKeyOf, THUMB_WIDTH_PX } from './gallery-image.js';

const solid = (w: number, h: number, rgb: [number, number, number]) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).jpeg().toBuffer();

describe('thumbKeyOf', () => {
  it('remplace l’extension par .thumb.webp', () => {
    expect(thumbKeyOf('class-types/abc/123.jpeg')).toBe('class-types/abc/123.thumb.webp');
    expect(thumbKeyOf('rooms/r1/x.png')).toBe('rooms/r1/x.thumb.webp');
  });
});

describe('processGalleryImage', () => {
  it('produit miniature WebP réduite, dimensions et blurhash', async () => {
    const { thumb, meta } = await processGalleryImage(await solid(2000, 1000, [200, 30, 30]));
    expect(meta).toMatchObject({ width: 2000, height: 1000 });
    expect(meta.blurhash).toMatch(/^[0-9A-Za-z#$%*+,\-.:;=?@[\]^_{|}~]+$/);
    const info = await sharp(thumb).metadata();
    expect(info.format).toBe('webp');
    expect(info.width).toBe(THUMB_WIDTH_PX);
  });
  it('n’agrandit pas une petite image', async () => {
    const { thumb } = await processGalleryImage(await solid(300, 200, [10, 10, 10]));
    expect((await sharp(thumb).metadata()).width).toBe(300);
  });
  it('refuse un fichier qui n’est pas une image', async () => {
    await expect(processGalleryImage(Buffer.from('pas une image'))).rejects.toThrow(/INVALID_IMAGE/);
  });
});
