import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from '../api/client';
import { tokenStorage } from '../api/storage';
import { otpRateLimitMessage } from '../utils/otpErrors';

const tokens = { access: 'old-access', refresh: 'refresh-1' as string | null };
vi.mock('../api/storage', () => ({
  tokenStorage: {
    getAccessToken: vi.fn(async () => tokens.access),
    getRefreshToken: vi.fn(async () => tokens.refresh),
    setTokens: vi.fn(async (a: string, r: string) => {
      tokens.access = a;
      tokens.refresh = r;
    }),
    clear: vi.fn(async () => {
      tokens.access = '';
      tokens.refresh = null;
    }),
  },
}));

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  tokens.access = 'old-access';
  tokens.refresh = 'refresh-1';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('envoie le jeton et renvoie le JSON', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    await expect(apiRequest('/v1/me')).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/v1\/me$/);
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer old-access');
  });

  it('n’envoie pas de jeton quand auth: false', async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));
    await apiRequest('/v1/auth/login', { method: 'POST', body: { a: 1 }, auth: false });
    const init = fetchMock.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body).toBe('{"a":1}');
  });

  it('gère 204 et les corps vides', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiRequest('/v1/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('transforme une erreur API en ApiError (code, statut, détails)', async () => {
    fetchMock.mockResolvedValueOnce(json(429, { code: 'OTP_RATE_LIMITED', message: 'slow', details: { retryAfterSeconds: 130 } }));
    const err = await apiRequest('/v1/x', { auth: false }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'OTP_RATE_LIMITED', status: 429, details: { retryAfterSeconds: 130 } });
    expect(otpRateLimitMessage(err)).toContain('3'); // 130 s → 3 minutes
  });

  it('corps d’erreur illisible : code UNKNOWN', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 502, statusText: 'Bad Gateway' }));
    await expect(apiRequest('/v1/x')).rejects.toMatchObject({ code: 'UNKNOWN', status: 502 });
  });

  it('sur 401 : rafraîchit les jetons puis rejoue la requête', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { code: 'UNAUTHORIZED' }))
      .mockResolvedValueOnce(json(200, { accessToken: 'new-access', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(json(200, { me: 1 }));
    await expect(apiRequest('/v1/me')).resolves.toEqual({ me: 1 });
    expect(tokenStorage.setTokens).toHaveBeenCalledWith('new-access', 'refresh-2');
    const retry = fetchMock.mock.calls[2][1]!;
    expect((retry.headers as Record<string, string>).Authorization).toBe('Bearer new-access');
  });

  it('plusieurs 401 simultanés : un seul rafraîchissement', async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/v1/auth/refresh')) {
        refreshCalls++;
        return json(200, { accessToken: 'new-access', refreshToken: 'refresh-2' });
      }
      return tokens.access === 'new-access' ? json(200, { ok: 1 }) : json(401, {});
    });
    await Promise.all([apiRequest('/v1/a'), apiRequest('/v1/b'), apiRequest('/v1/c')]);
    expect(refreshCalls).toBe(1);
  });

  it('refresh refusé : vide les jetons et lève REFRESH_FAILED', async () => {
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
    await expect(apiRequest('/v1/me')).rejects.toMatchObject({ code: 'REFRESH_FAILED' });
    expect(tokenStorage.clear).toHaveBeenCalled();
  });

  it('401 sans jeton de rafraîchissement : NO_REFRESH_TOKEN', async () => {
    tokens.refresh = null;
    fetchMock.mockResolvedValueOnce(json(401, {}));
    await expect(apiRequest('/v1/me')).rejects.toMatchObject({ code: 'NO_REFRESH_TOKEN' });
  });
});

describe('otpRateLimitMessage', () => {
  it('ignore les autres erreurs', () => {
    expect(otpRateLimitMessage(new ApiError('OTHER', 'x', 400))).toBeNull();
    expect(otpRateLimitMessage(new Error('x'))).toBeNull();
  });
  it('minimum 1 minute, 60 s par défaut', () => {
    expect(otpRateLimitMessage(new ApiError('OTP_RATE_LIMITED', 'x', 429, { retryAfterSeconds: 5 }))).toContain('1');
    expect(otpRateLimitMessage(new ApiError('OTP_RATE_LIMITED', 'x', 429))).toContain('1');
  });
});
