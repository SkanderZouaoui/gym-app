import { BadRequestException } from '@nestjs/common';
import { encode } from 'blurhash';
import sharp from 'sharp';
import type { Prisma } from '@prisma/client';

/** Largeur des miniatures de galerie (cartes, mosaïque) : suffisant pour un écran 3x sans charger la photo d'origine. */
export const THUMB_WIDTH_PX = 720;

/** Métadonnées d'une photo de galerie, indexées par clé de stockage. */
export interface GalleryImageMeta {
  /** Aperçu flou affiché pendant le chargement ; sa composante moyenne donne aussi la couleur dominante. */
  blurhash: string;
  width: number;
  height: number;
}
export type GalleryMeta = Record<string, GalleryImageMeta>;

/** Clé de la miniature d'une photo : `class-types/<id>/<uuid>.jpeg` → `class-types/<id>/<uuid>.thumb.webp`. */
export function thumbKeyOf(key: string): string {
  return `${key.replace(/\.[^./]+$/, '')}.thumb.webp`;
}

/**
 * Prépare une photo envoyée : vérifie qu'elle est décodable, remet à l'endroit (EXIF), produit une miniature WebP et un
 * aperçu flou (blurhash 4×3). Lève INVALID_IMAGE si le fichier n'est pas une image.
 */
export async function processGalleryImage(input: Buffer): Promise<{ thumb: Buffer; meta: GalleryImageMeta }> {
  try {
    const oriented = await sharp(input, { limitInputPixels: 50_000_000 }).rotate().toBuffer({ resolveWithObject: true });
    const { width, height } = oriented.info;
    const thumb = await sharp(oriented.data).resize({ width: THUMB_WIDTH_PX, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
    const small = await sharp(oriented.data).resize(32, 32, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const blurhash = encode(new Uint8ClampedArray(small.data), small.info.width, small.info.height, 4, 3);
    return { thumb, meta: { blurhash, width, height } };
  } catch {
    throw new BadRequestException('INVALID_IMAGE');
  }
}

/** Lit la colonne JSON `galleryMeta` (objet vide si absente ou invalide). */
export function readGalleryMeta(value: unknown): GalleryMeta {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as GalleryMeta) : {};
}

/** Prépare `galleryMeta` pour l'écriture en base. */
export function toGalleryJson(meta: GalleryMeta): Prisma.InputJsonObject {
  return meta as unknown as Prisma.InputJsonObject;
}
