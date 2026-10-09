import type { Role } from '@muscleup/shared';

/** Route racine du groupe de navigation pour chaque rôle (section 10.2).
 * Adhérent et Coach nichent leurs 5 onglets sous un sous-groupe (tabs) — le
 * reste du dossier est un Stack de détail — donc leur racine réelle vit à
 * .../(tabs) et pas directement à la racine du groupe de rôle. */
export function rootRouteForRole(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/(admin)';
    case 'STAFF':
      return '/(staff)';
    case 'COACH':
      return '/(coach)/(tabs)';
    case 'MEMBER':
    default:
      return '/(member)/(tabs)';
  }
}
