import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { LOGO_MAX_PX, processLogo } from './logo-image.js';

const png = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();

describe('processLogo', () => {
  it('réduit en WebP sans déformer, transparence conservée', async () => {
    const out = await sharp(await processLogo(await png(2000, 1000))).metadata();
    expect(out.format).toBe('webp');
    expect(out.width).toBe(LOGO_MAX_PX);
    expect(out.height).toBe(LOGO_MAX_PX / 2);
    expect(out.hasAlpha).toBe(true);
  });
  it('n’agrandit pas un petit logo', async () => {
    expect((await sharp(await processLogo(await png(100, 80))).metadata()).width).toBe(100);
  });
  it('refuse un fichier qui n’est pas une image', async () => {
    await expect(processLogo(Buffer.from('nope'))).rejects.toThrow(/INVALID_IMAGE/);
  });
});
