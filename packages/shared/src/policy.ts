import { z } from "zod";

export const attendancePolicySchema = z.object({
  scanOpensMinutesBefore: z.number().int().nonnegative(),
  scanClosesMinutesAfterStart: z.number().int().nonnegative(),
  allowWalkIn: z.boolean(),
  noShowGraceMinutes: z.number().int().nonnegative(),
  noShowPenalty: z.object({
    enabled: z.boolean(),
    threshold: z.number().int().positive(),
    windowDays: z.number().int().positive(),
    blockBookingDays: z.number().int().positive(),
  }),
  staffCanRecordPayments: z.boolean(),
});
export type AttendancePolicy = z.infer<typeof attendancePolicySchema>;

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  scanOpensMinutesBefore: 15,
  scanClosesMinutesAfterStart: 10,
  allowWalkIn: false,
  noShowGraceMinutes: 15,
  noShowPenalty: {
    enabled: false,
    threshold: 3,
    windowDays: 30,
    blockBookingDays: 7,
  },
  staffCanRecordPayments: true,
};

/**
 * Politique d'estimation de l'occupation de la salle (pas de tourniquet ni de capteur).
 * estimation = wifiWeight × compteWifi + otherNetworkWeight × compteAppAutreRéseau.
 * Le chiffre obtenu est une APPROXIMATION : il ne doit jamais être présenté comme un comptage exact.
 */
export const occupancyPolicySchema = z.object({
  /** Poids d'un adhérent vu sur le WiFi de la salle (signal fort). */
  wifiWeight: z.number().min(0).max(1),
  /** Poids d'un adhérent ayant ouvert l'app depuis un autre réseau (signal faible). */
  otherNetworkWeight: z.number().min(0).max(1),
  /** Fenêtre glissante : sans nouvelle requête depuis ce délai, l'adhérent sort du calcul. */
  presenceWindowMinutes: z.number().int().min(5).max(240),
  /** Durée proposée par défaut pour un réglage manuel. */
  manualOverrideDefaultDurationMinutes: z.number().int().min(5).max(720),
  /** Durée maximale d'un réglage manuel (« jusqu'à nouvel ordre ») : il expire toujours. */
  manualOverrideMaxDurationMinutes: z.number().int().min(15).max(1440),
  /** Les adhérents voient l'estimation dans l'app (sans le détail des signaux). */
  visibleToMembers: z.boolean(),
});
export type OccupancyPolicy = z.infer<typeof occupancyPolicySchema>;

export const DEFAULT_OCCUPANCY_POLICY: OccupancyPolicy = {
  wifiWeight: 1,
  otherNetworkWeight: 0.3,
  presenceWindowMinutes: 25,
  manualOverrideDefaultDurationMinutes: 30,
  manualOverrideMaxDurationMinutes: 720,
  visibleToMembers: false,
};

export type OccupancySource = "AUTO" | "MANUAL";

/** Réponse de GET /v1/occupancy. `estimate` est arrondi ; ce n'est jamais un comptage exact. */
export interface OccupancyEstimate {
  estimate: number;
  source: OccupancySource;
  wifiCount: number;
  otherNetworkCount: number;
  /** false si l'IP publique de la salle n'est pas renseignée : le signal WiFi vaut alors toujours 0. */
  publicIpConfigured: boolean;
  lastUpdatedAt: string;
  override?: {
    count: number;
    setBy: { id: string; firstName: string; lastName: string } | null;
    note: string | null;
    setAt: string;
    expiresAt: string;
  };
}
