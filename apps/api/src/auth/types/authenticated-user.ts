import type { Role } from '@muscleup/shared';

export interface BranchRoleGrant {
  role: Role;
  /** null = portée réseau (toutes les branches) pour ce rôle. */
  branchId: string | null;
}

/**
 * Utilisateur authentifié tel qu'attaché à `request.user` par JwtStrategy.
 * `activeRole` est le rôle sous lequel l'utilisateur agit dans cette requête
 * (un même compte peut cumuler plusieurs rôles, cf. section 3 du document
 * de conception — sélecteur de rôle côté app).
 */
export interface AuthenticatedUser {
  userId: string;
  activeRole: Role;
  /** Toutes les attributions rôle/branche de l'utilisateur. */
  grants: BranchRoleGrant[];
  homeBranchId: string | null;
}
