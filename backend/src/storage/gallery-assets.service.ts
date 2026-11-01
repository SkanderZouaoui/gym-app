import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { processGalleryImage, readGalleryMeta, thumbKeyOf, type GalleryImageMeta } from './gallery-image.js';

/** Fichiers dérivés d'une galerie de photos (miniatures, aperçus flous) et URLs de lecture : partagés par les cours, les salles et l'établissement. */
@Injectable()
export class GalleryAssetsService {
  constructor(private readonly storage: StorageService) {}

  /** Ajoute à un objet portant `galleryKeys` / `galleryMeta` les URLs de lecture, miniatures, aperçus flous et proportions. */
  async withUrls<T extends { galleryKeys: string[]; galleryMeta?: unknown }>(item: T) {
    const meta = readGalleryMeta(item.galleryMeta);
    const galleryUrls = await Promise.all(item.galleryKeys.map((key) => this.storage.getReadUrl(key)));
    // Miniature (cartes, mosaïque) et aperçu flou : absents des anciennes photos, le client retombe alors sur l'original.
    const galleryThumbUrls = await Promise.all(
      item.galleryKeys.map((key, i) => (meta[key] ? this.storage.getReadUrl(thumbKeyOf(key)) : galleryUrls[i])),
    );
    const galleryBlurhashes = item.galleryKeys.map((key) => meta[key]?.blurhash ?? null);
    // Proportions (largeur / hauteur) : la visionneuse anime l'ouverture vers la forme réelle de la photo.
    const galleryRatios = item.galleryKeys.map((key) => (meta[key] ? meta[key].width / meta[key].height : null));
    return { ...item, galleryUrls, galleryThumbUrls, galleryBlurhashes, galleryRatios };
  }

  /** Lit la photo envoyée, vérifie que c'est une image, enregistre sa miniature et renvoie ses métadonnées. */
  async prepare(key: string): Promise<GalleryImageMeta> {
    try {
      const { thumb, meta } = await processGalleryImage(await this.storage.getObjectBuffer(key));
      await this.storage.putObject(thumbKeyOf(key), thumb, 'image/webp');
      return meta;
    } catch (err) {
      await this.storage.deleteObject(key).catch(() => undefined);
      throw err;
    }
  }

  /** Supprime les photos et leurs miniatures (sans échouer si l'une est déjà absente). */
  async deleteFiles(keys: string[]) {
    await Promise.all(keys.flatMap((k) => [k, thumbKeyOf(k)]).map((k) => this.storage.deleteObject(k).catch(() => undefined)));
  }
}
