const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function decode83(str: string): number {
  let value = 0;
  for (const c of str) {
    const digit = ALPHABET.indexOf(c);
    if (digit < 0) return NaN;
    value = value * 83 + digit;
  }
  return value;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Couleur moyenne d'une image à partir de son blurhash (la composante continue est stockée en sRGB 8 bits dans les caractères 3 à 6). */
export function blurhashAverageColor(hash: string | null | undefined): Rgb | null {
  if (!hash || hash.length < 6) return null;
  const dc = decode83(hash.slice(2, 6));
  if (Number.isNaN(dc)) return null;
  return { r: (dc >> 16) & 255, g: (dc >> 8) & 255, b: dc & 255 };
}

/** `rgba(r,g,b,a)` de la couleur moyenne, ou `fallback` si le blurhash est absent ou invalide. */
export function blurhashRgba(hash: string | null | undefined, alpha: number, fallback: string): string {
  const c = blurhashAverageColor(hash);
  return c ? `rgba(${c.r},${c.g},${c.b},${alpha})` : fallback;
}
