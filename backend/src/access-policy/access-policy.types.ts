import type { AccessReasonCode } from '@muscleup/shared';

export interface PolicyResult {
  allowed: boolean;
  reasonCode: AccessReasonCode;
}

export const allow = (): PolicyResult => ({ allowed: true, reasonCode: 'OK' });
export const deny = (reasonCode: AccessReasonCode): PolicyResult => ({
  allowed: false,
  reasonCode,
});
