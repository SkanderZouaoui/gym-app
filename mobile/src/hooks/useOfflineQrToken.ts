import { useCallback, useEffect, useState } from 'react';
import { meApi } from '../api/endpoints';
import { getItem, setItem } from '../api/storage';

const OFFLINE_TOKEN_KEY = 'muscleup.offlineQrToken';
const OFFLINE_EXPIRES_KEY = 'muscleup.offlineQrTokenExpiresAt';
// Rafraîchir dès qu'il reste moins de 2h de validité, pour toujours avoir une
// marge confortable même si l'app reste hors ligne un bon moment.
const REFRESH_MARGIN_MS = 2 * 60 * 60 * 1000;

interface CachedOfflineToken {
  token: string;
  expiresAt: number;
}

async function readCache(): Promise<CachedOfflineToken | null> {
  const [token, expiresAtRaw] = await Promise.all([getItem(OFFLINE_TOKEN_KEY), getItem(OFFLINE_EXPIRES_KEY)]);
  if (!token || !expiresAtRaw) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;
  return { token, expiresAt };
}

async function writeCache(token: string, expiresInSeconds: number): Promise<CachedOfflineToken> {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  await Promise.all([setItem(OFFLINE_TOKEN_KEY, token), setItem(OFFLINE_EXPIRES_KEY, String(expiresAt))]);
  return { token, expiresAt };
}

/**
 * QR de secours (section 6.6) : récupère et met en cache sécurisé un token
 * longue durée (12h) pendant qu'on est en ligne, pour pouvoir l'afficher
 * sans réseau. Le cache est rafraîchi automatiquement à chaque montage tant
 * que le réseau répond, et reste disponible via `getCachedToken()` sinon.
 */
export function useOfflineQrToken() {
  const [cached, setCached] = useState<CachedOfflineToken | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await meApi.getOfflineQrToken();
      const next = await writeCache(res.token, res.expiresInSeconds);
      setCached(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const existing = await readCache();
      setCached(existing);
      setLoaded(true);
      if (!existing || existing.expiresAt - Date.now() < REFRESH_MARGIN_MS) {
        await refresh();
      }
    })();
  }, [refresh]);

  const isValid = !!cached && cached.expiresAt > Date.now();

  return {
    loaded,
    token: isValid ? cached!.token : null,
    expiresAt: isValid ? cached!.expiresAt : null,
    refresh,
  };
}
