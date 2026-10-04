import axios, { AxiosError } from 'axios';
import { tokenStorage } from './storage';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

  const res = await axios.post(`${BASE_URL}/v1/auth/refresh`, { refreshToken });
  tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !(original as any)._retry) {
      (original as any)._retry = true;
      try {
        refreshPromise ??= refreshTokens().finally(() => {
          refreshPromise = null;
        });
        await refreshPromise;
        return api(original);
      } catch {
        tokenStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiErrorBody {
  code: string;
  message: string;
}

export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.message ?? fallback;
  }
  return fallback;
}
