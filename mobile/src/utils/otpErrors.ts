import i18n from '../i18n';
import { ApiError } from '../api/client';

/** Message traduit « trop de codes demandés » avec le temps restant, ou null si l'erreur est autre. */
export function otpRateLimitMessage(e: unknown): string | null {
  if (!(e instanceof ApiError) || e.code !== 'OTP_RATE_LIMITED') return null;
  const seconds = (e.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 60;
  return i18n.t('common.otp_rate_limited', { minutes: Math.max(1, Math.ceil(seconds / 60)) });
}
