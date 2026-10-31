export interface GalleryPhoto {
  /** Photo d'origine (visionneuse, partage). */
  url: string;
  /** Miniature légère (cartes, mosaïque) ; l'original pour les anciennes photos. */
  thumbUrl: string;
  /** Aperçu flou affiché pendant le chargement, et source de la couleur dominante. */
  blurhash: string | null;
}

export interface GallerySource {
  galleryUrls?: string[];
  galleryThumbUrls?: string[];
  galleryBlurhashes?: (string | null)[];
}

/** Photos d'un cours ou d'une salle, telles que renvoyées par l'API. */
export function photosOf(source: GallerySource | null | undefined): GalleryPhoto[] {
  return (source?.galleryUrls ?? []).map((url, i) => ({
    url,
    thumbUrl: source?.galleryThumbUrls?.[i] ?? url,
    blurhash: source?.galleryBlurhashes?.[i] ?? null,
  }));
}

export interface GallerySection {
  id: string;
  label: string;
  photos: GalleryPhoto[];
}

/** Position d'une vignette à l'écran (coordonnées de la fenêtre), pour la transition vers la visionneuse. */
export interface PhotoOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}
