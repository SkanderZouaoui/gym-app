import { tokenStorage } from './storage';
import i18n from '../i18n';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // défaut true
}

let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) throw new ApiError('NO_REFRESH_TOKEN', i18n.t('common.session_expired'), 401);

  const res = await fetch(`${BASE_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await tokenStorage.clear();
    throw new ApiError('REFRESH_FAILED', i18n.t('common.session_expired'), 401);
  }
  const data = await res.json();
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
}

/** Délai avant de pouvoir réessayer (secondes), lu dans les en-têtes `Retry-After*` d'une réponse 429 (le serveur les
 * suffixe du nom de la limite touchée : `Retry-After-auth-account`…). Le plus long l'emporte. */
function readRetryAfterSeconds(res: Response): number | undefined {
  let max = 0;
  res.headers.forEach((value, name) => {
    if (!name.toLowerCase().startsWith('retry-after')) return;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > max) max = seconds;
  });
  return max > 0 ? max : undefined;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = await tokenStorage.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && auth) {
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });
    await refreshPromise;
    res = await doFetch();
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText }));
    const retryAfterSeconds = res.status === 429 ? readRetryAfterSeconds(res) : undefined;
    const details = payload.details ?? (retryAfterSeconds ? { retryAfterSeconds } : undefined);
    throw new ApiError(payload.code ?? 'UNKNOWN', payload.message ?? res.statusText, res.status, details);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
