import { tokenStorage } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
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
  if (!refreshToken) throw new ApiError('NO_REFRESH_TOKEN', 'Session expirée', 401);

  const res = await fetch(`${BASE_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await tokenStorage.clear();
    throw new ApiError('REFRESH_FAILED', 'Session expirée', 401);
  }
  const data = await res.json();
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
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
    throw new ApiError(payload.code ?? 'UNKNOWN', payload.message ?? res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
