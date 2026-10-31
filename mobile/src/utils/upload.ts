/** Types d'image acceptés par l'API ; `image/jpg` (certains appareils Android) est ramené à `image/jpeg`. */
export function normalizeImageType(mime?: string | null): string {
  const m = (mime ?? 'image/jpeg').toLowerCase();
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

/** Taille max d'un envoi (octets) — doit rester alignée sur MAX_UPLOAD_BYTES côté API. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Lit le fichier local et vérifie sa taille avant de demander l'URL d'envoi (la taille est signée dans l'URL). */
export async function readUploadBlob(uri: string): Promise<Blob> {
  const blob = await (await fetch(uri)).blob();
  if (blob.size <= 0 || blob.size > MAX_UPLOAD_BYTES) throw new Error('FILE_TOO_LARGE');
  return blob;
}
