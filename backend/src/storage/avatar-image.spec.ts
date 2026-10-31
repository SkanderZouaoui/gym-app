import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { AVATAR_SIZE_PX, cropAvatarImage } from './avatar-image.js';

/** Image 400×200 : moitié gauche rouge, moitié droite bleue. */
async function twoColorImage(): Promise<Buffer> {
  const half = (color: string) => sharp({ create: { width: 200, height: 200, channels: 3, background: color } }).png().toBuffer();
  return sharp({ create: { width: 400, height: 200, channels: 3, background: '#000' } })
    .composite([
      { input: await half('#ff0000'), left: 0, top: 0 },
      { input: await half('#0000ff'), left: 200, top: 0 },
    ])
    .png()
    .toBuffer();
}

describe('cropAvatarImage', () => {
  it('recadre la zone demandée en JPEG carré 512×512', async () => {
    const out = await cropAvatarImage(await twoColorImage(), { left: 0.5, top: 0, width: 0.5, height: 1 });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect([meta.width, meta.height]).toEqual([AVATAR_SIZE_PX, AVATAR_SIZE_PX]);

    const { dominant } = await sharp(out).stats();
    expect(dominant.b).toBeGreaterThan(200); // moitié droite : bleue
    expect(dominant.r).toBeLessThan(60);
  });

  it('borne une zone qui déborde de l\'image au bord de celle-ci', async () => {
    const out = await cropAvatarImage(await twoColorImage(), { left: 0.5, top: 0, width: 2 as unknown as number, height: 1 });
    const { dominant } = await sharp(out).stats();
    expect(dominant.b).toBeGreaterThan(200);
  });

  it('refuse une zone trop petite', async () => {
    await expect(cropAvatarImage(await twoColorImage(), { left: 0, top: 0, width: 0.05, height: 0.1 })).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'CROP_TOO_SMALL' }),
    });
  });

  it('refuse un fichier qui n\'est pas une image', async () => {
    await expect(cropAvatarImage(Buffer.from('<html>pas une image</html>'), { left: 0, top: 0, width: 1, height: 1 })).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'INVALID_IMAGE' }),
    });
  });
});
