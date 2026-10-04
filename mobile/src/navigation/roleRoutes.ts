import type { Role } from '@muscleup/shared';

/** Route racine du groupe de navigation pour chaque rôle (section 10.2). */
export function rootRouteForRole(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/(admin)';
    case 'STAFF':
      return '/(staff)';
    case 'COACH':
      return '/(coach)';
    case 'MEMBER':
    default:
      return '/(member)';
  }
}
