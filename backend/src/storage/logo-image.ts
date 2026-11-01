import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export const LOGO_MAX_PX = 512;

/** Vérifie que le fichier est une image, la remet à l'endroit, la réduit à 512 px max et l'encode en WebP (transparence conservée). */
export async function processLogo(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(LOGO_MAX_PX, LOGO_MAX_PX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    throw new BadRequestException('INVALID_IMAGE');
  }
}
