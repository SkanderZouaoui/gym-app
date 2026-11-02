import { BlockList, isIP } from 'node:net';
import type { Request } from 'express';

/**
 * IP source réelle d'une requête. Derrière un reverse proxy (Caddy/Nginx), `req.ip` ne lit
 * `X-Forwarded-For` que si Express a `trust proxy` configuré (variable TRUST_PROXY, voir main.ts) :
 * on ne lit jamais l'en-tête nous-mêmes, sinon n'importe quel client pourrait se déclarer « sur le WiFi ».
 */
export function clientIp(req: Pick<Request, 'ip' | 'socket'>): string | null {
  const raw = req.ip ?? req.socket?.remoteAddress ?? null;
  return raw ? normalizeIp(raw) : null;
}

/** Retire le préfixe IPv4-mappé (`::ffff:1.2.3.4` → `1.2.3.4`) et les espaces. */
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.toLowerCase().startsWith('::ffff:') && isIP(trimmed.slice(7)) === 4 ? trimmed.slice(7) : trimmed;
}

/** Entrées valides de `publicIp` : IPs ou plages CIDR séparées par des virgules. */
export function parsePublicIpEntries(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

export function isValidPublicIpEntry(entry: string): boolean {
  const [ip, prefix] = entry.split('/');
  const family = isIP(ip ?? '');
  if (family === 0) return false;
  if (prefix === undefined) return true;
  const n = Number(prefix);
  return Number.isInteger(n) && n >= 0 && n <= (family === 4 ? 32 : 128);
}

/**
 * Construit le filtre « réseau de la salle » à partir de `publicIp`.
 * - IPv4 : correspondance exacte (l'IP publique de la box, partagée par tous les appareils en NAT).
 * - IPv6 sans préfixe : chaque appareil a sa propre adresse, on compare donc le préfixe /64 du réseau.
 * - CIDR explicite (`a.b.c.d/28`) : la plage indiquée.
 * Si la box change souvent d'IP publique, recommander au client un DDNS (No-IP, DuckDNS) et une
 * mise à jour automatique de ce champ — hors périmètre pour l'instant.
 */
export function buildVenueNetwork(publicIp: string | null | undefined): BlockList | null {
  const entries = parsePublicIpEntries(publicIp).filter(isValidPublicIpEntry);
  if (entries.length === 0) return null;
  const list = new BlockList();
  for (const entry of entries) {
    const [ip, prefix] = entry.split('/') as [string, string | undefined];
    const type = isIP(ip) === 6 ? 'ipv6' : 'ipv4';
    if (prefix !== undefined) list.addSubnet(ip, Number(prefix), type);
    else if (type === 'ipv6') list.addSubnet(ip, 64, 'ipv6');
    else list.addAddress(ip, 'ipv4');
  }
  return list;
}

export function isOnVenueNetwork(network: BlockList | null, ip: string | null): boolean {
  if (!network || !ip) return false;
  const family = isIP(ip);
  if (family === 0) return false;
  try {
    return network.check(ip, family === 6 ? 'ipv6' : 'ipv4');
  } catch {
    return false;
  }
}
