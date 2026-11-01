import { BadRequestException } from '@nestjs/common';

export interface LatLng {
  latitude: number;
  longitude: number;
}

const num = '(-?\\d{1,3}(?:\\.\\d+)?)';
const PATTERNS = [
  new RegExp(`!3d${num}!4d${num}`), // position du lieu (plus précise que la vue)
  new RegExp(`@${num},${num}`),
  new RegExp(`[?&](?:q|ll|query|destination|daddr|center|sll)=${num}(?:,|%2C)\\s*${num}`, 'i'),
  new RegExp(`^\\s*${num}\\s*[,;\\s]\\s*${num}\\s*$`),
];

const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Dans le corps d'une page, seules ces formes désignent le lieu lui-même : `@lat,lng` y est la vue par défaut (souvent la région de l'appelant). */
const PLACE_PATTERNS = [PATTERNS[0], new RegExp(`[?&;]center=${num}(?:,|%2C)\\s*${num}`, 'i')];

/** Position contenue dans un texte (lien Google Maps, « lat, lng »…), sans accès réseau. */
export function parseLocation(text: string, patterns: RegExp[] = PATTERNS): LatLng | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    const latitude = Number(m[1]);
    const longitude = Number(m[2]);
    if (valid(latitude, longitude)) return { latitude, longitude };
  }
  return null;
}

/** Premier lien http(s) d'un texte (le partage Google Maps colle « Nom du lieu\nhttps://… »). */
export function firstUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>"']+/i)?.[0] ?? null;
}

/** Seuls les domaines de Google Maps sont suivis : la résolution ne doit jamais servir à joindre un serveur quelconque. */
export function isAllowedMapsHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'maps.app.goo.gl' || h === 'goo.gl' || h === 'g.co' || h === 'maps.google.com' || h === 'google.com' || h.endsWith('.google.com');
}

const MAX_HOPS = 6;
const TIMEOUT_MS = 7000;
const MAX_BODY_CHARS = 600_000;

type Fetcher = typeof fetch;

/**
 * Trouve la position d'un texte collé par l'admin : directement si elle y figure, sinon en suivant (au plus 6 redirections,
 * vers Google uniquement) un lien court `maps.app.goo.gl` ou une page de lieu, puis en lisant l'adresse finale et, à défaut,
 * le début de la page.
 */
export async function resolveLocation(text: string, fetcher: Fetcher = fetch): Promise<LatLng> {
  const direct = parseLocation(text);
  if (direct) return direct;

  let url = firstUrl(text);
  for (let hop = 0; url && hop <= MAX_HOPS; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      break;
    }
    if (parsed.protocol !== 'https:' || !isAllowedMapsHost(parsed.hostname)) break;
    const fromUrl = parseLocation(decodeURIComponent(parsed.href));
    if (fromUrl) return fromUrl;

    let res: Response;
    try {
      res = await fetcher(parsed.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MuscleUP/1.0)', 'Accept-Language': 'fr' },
      });
    } catch {
      break;
    }
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, parsed).href;
      continue;
    }
    if (res.ok) {
      const body = (await res.text()).slice(0, MAX_BODY_CHARS);
      const found = parseLocation(body, PLACE_PATTERNS) ?? parseLocation(body.replace(/&amp;/g, '&').replace(/\\u003d/g, '=').replace(/\\u0026/g, '&'), PLACE_PATTERNS);
      if (found) return found;
    }
    break;
  }
  throw new BadRequestException('LOCATION_NOT_FOUND');
}
