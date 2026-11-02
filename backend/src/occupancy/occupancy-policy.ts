import { DEFAULT_OCCUPANCY_POLICY, occupancyPolicySchema, type OccupancyPolicy } from '@muscleup/shared';

/** Politique enregistrée (JSONB, éventuellement vide ou partielle) complétée par les valeurs par défaut. */
export function readOccupancyPolicy(raw: unknown): OccupancyPolicy {
  const merged = { ...DEFAULT_OCCUPANCY_POLICY, ...(raw && typeof raw === 'object' ? raw : {}) };
  const parsed = occupancyPolicySchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_OCCUPANCY_POLICY;
}

/**
 * Estimation pondérée — APPROXIMATION, jamais un comptage exact :
 * `wifiWeight × compteWifi + otherNetworkWeight × compteAppAutreRéseau`, arrondie à l'entier.
 * Le signal « app ouverte ailleurs » pèse peu : on peut ouvrir l'app depuis chez soi.
 */
export function weightedEstimate(wifiCount: number, otherNetworkCount: number, policy: OccupancyPolicy): number {
  return Math.max(0, Math.round(policy.wifiWeight * wifiCount + policy.otherNetworkWeight * otherNetworkCount));
}
