import { useSessionStore } from '../store/session';

/** Chemins des écrans partagés entre l'espace Accueil et l'espace Admin (adhérents, caisse),
 * selon le rôle actif : chaque espace a sa propre pile de navigation. */
export function useStaffRoutes() {
  const admin = useSessionStore((s) => s.activeRole) === 'ADMIN';
  const base = admin ? '/(admin)' : '/(staff)';
  return {
    members: (admin ? '/(admin)/(tabs)/members' : '/(staff)/(tabs)/members') as never,
    cash: (admin ? '/(admin)/cash' : '/(staff)/(tabs)/cash') as never,
    member: (id: string) => `${base}/member/${id}` as never,
    memberCreate: `${base}/member-create` as never,
    cashSelect: `${base}/cash-select` as never,
    cashSell: `${base}/cash-sell` as never,
    cashReceipt: `${base}/cash-receipt` as never,
  };
}
