import type { Role } from '@muscleup/shared';

export interface AccessTokenPayload {
  sub: string;
  activeRole: Role;
  roles: Role[];
}
