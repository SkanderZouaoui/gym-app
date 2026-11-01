export interface LatLng {
  latitude: number;
  longitude: number;
}

const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Extrait une position d'un texte collé : lien Google Maps (« …/@36.80,10.18,17z », « ?q=36.80,10.18 », « !3d36.80!4d10.18 »,
 * « ll=… »), ou simplement « 36.80, 10.18 ». Les liens courts (maps.app.goo.gl) ne contiennent pas la position : null.
 */
export function parseMapsLocation(text: string): LatLng | null {
  const num = '(-?\\d{1,3}(?:\\.\\d+)?)';
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`@${num},${num}`),
    new RegExp(`[?&](?:q|ll|query|destination|daddr)=${num}(?:,|%2C)\\s*${num}`),
    new RegExp(`^\\s*${num}\\s*[,;\\s]\\s*${num}\\s*$`),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    const latitude = Number(m[1]);
    const longitude = Number(m[2]);
    if (valid(latitude, longitude)) return { latitude, longitude };
  }
  return null;
}

/** Lien d'itinéraire universel (ouvre l'application de cartes, ou le navigateur à défaut), vers la position ou l'adresse. */
export function directionsUrl(target: { latitude?: number | null; longitude?: number | null; address?: string }): string | null {
  const destination =
    target.latitude != null && target.longitude != null ? `${target.latitude},${target.longitude}` : target.address?.trim() ? target.address.trim() : null;
  return destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` : null;
}

const TILE = 256;

/** Pixels « monde » (Web Mercator) d'une position au niveau de zoom donné. */
export function worldPixel({ latitude, longitude }: LatLng, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((latitude * Math.PI) / 180);
  return { x: ((longitude + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

export interface MapTile {
  x: number;
  y: number;
  z: number;
  /** Position de la tuile dans la vignette, en pixels, la position visée étant au centre. */
  left: number;
  top: number;
}

/** Tuiles OpenStreetMap couvrant une vignette `width × height` centrée sur `center`. */
export function tilesAround(center: LatLng, zoom: number, width: number, height: number): MapTile[] {
  const c = worldPixel(center, zoom);
  const originX = c.x - width / 2;
  const originY = c.y - height / 2;
  const max = 2 ** zoom;
  const tiles: MapTile[] = [];
  for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + height) / TILE); ty++) {
    for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + width) / TILE); tx++) {
      if (ty < 0 || ty >= max) continue;
      tiles.push({ x: ((tx % max) + max) % max, y: ty, z: zoom, left: tx * TILE - originX, top: ty * TILE - originY });
    }
  }
  return tiles;
}
