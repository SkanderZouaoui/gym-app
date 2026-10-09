import type { Role } from '@muscleup/shared';

/**
 * Utilisateur authentifié tel qu'attaché à `request.user` par JwtStrategy.
 * `activeRole` est le rôle sous lequel l'utilisateur agit dans cette requête
 * (un même compte peut cumuler plusieurs rôles, cf. section 3 du document
 * de conception — sélecteur de rôle côté app).
 */
export interface AuthenticatedUser {
  userId: string;
  activeRole: Role;
  /** Tous les rôles attribués à l'utilisateur. */
  roles: Role[];
}
