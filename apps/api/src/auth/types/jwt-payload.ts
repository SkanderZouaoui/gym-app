import type { Role } from '@muscleup/shared';
import type { BranchRoleGrant } from './authenticated-user.js';

export interface AccessTokenPayload {
  sub: string;
  activeRole: Role;
  grants: BranchRoleGrant[];
  homeBranchId: string | null;
}
