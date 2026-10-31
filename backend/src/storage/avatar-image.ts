import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

/** Zone à conserver, en fractions (0–1) de la largeur / hauteur de l'image d'origine. */
export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const AVATAR_SIZE_PX = 512;
const MIN_CROP_PX = 64;

/**
 * Recadre une image selon `rect`, la remet à l'endroit (EXIF), la redimensionne en carré 512×512 et la
 * ré-encode en JPEG. Le ré-encodage vérifie au passage que le fichier est bien une image décodable.
 */
export async function cropAvatarImage(input: Buffer, rect: CropRect): Promise<Buffer> {
  try {
    const oriented = await sharp(input, { limitInputPixels: 50_000_000 }).rotate().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = oriented.info;
    const left = clamp(Math.round(rect.left * w), 0, w - 1);
    const top = clamp(Math.round(rect.top * h), 0, h - 1);
    const width = clamp(Math.round(rect.width * w), 1, w - left);
    const height = clamp(Math.round(rect.height * h), 1, h - top);
    if (width < MIN_CROP_PX || height < MIN_CROP_PX) throw new BadRequestException('CROP_TOO_SMALL');

    return await sharp(oriented.data)
      .extract({ left, top, width, height })
      .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException('INVALID_IMAGE');
  }
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));
