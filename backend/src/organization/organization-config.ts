import { z } from 'zod';
import type { PrismaService } from '../prisma/prisma.service.js';

const hour = z.object({ open: z.boolean(), from: z.string().regex(/^\d{2}:\d{2}$/), to: z.string().regex(/^\d{2}:\d{2}$/) });

/** Réglages de la salle (écran Configuration admin) — stockés dans organization_settings.config. */
export const organizationConfigSchema = z.object({
  contact: z.object({
    address: z.string(),
    phone: z.string(),
    email: z.string(),
    visibleToMembers: z.boolean(),
  }),
  /** 7 jours, lundi → dimanche. */
  hours: z.array(hour).length(7),
  /** Moyens de paiement acceptés (OTHER = carte). Au moins un doit rester actif. */
  paymentMethods: z
    .object({ CASH: z.boolean(), OTHER: z.boolean(), TRANSFER: z.boolean(), CHECK: z.boolean() })
    .refine((m) => Object.values(m).some(Boolean), { message: 'AT_LEAST_ONE_PAYMENT_METHOD' }),
  announcements: z.object({
    /** Affichage des annonces sur l'accueil adhérent. */
    format: z.enum(['Bandeau', 'Pop-up', 'Encart']),
    /** Affichage des alertes (bandeaux d'information, avertissement, urgence). */
    alertFormat: z.enum(['Bandeau', 'Pop-up', 'Encart']),
    push: z.boolean(),
    expiryReminderDays: z.number().int().min(1).max(60),
  }),
  booking: z.object({
    cancelHoursBefore: z.number().int().min(0).max(72),
    defaultCapacity: z.number().int().min(1).max(200),
    waitlist: z.boolean(),
  }),
  /** Remise (en %) selon la durée d'engagement en mois. */
  discounts: z.record(z.string(), z.number().min(0).max(100)),
});
export type OrganizationConfig = z.infer<typeof organizationConfigSchema>;

const DEFAULT_HOURS = Array.from({ length: 7 }, (_, i) => ({ open: i !== 6, from: '07:00', to: i === 5 ? '20:00' : '22:00' }));

export const DEFAULT_ORGANIZATION_CONFIG: OrganizationConfig = {
  contact: { address: '', phone: '', email: '', visibleToMembers: true },
  hours: DEFAULT_HOURS,
  paymentMethods: { CASH: true, OTHER: true, TRANSFER: true, CHECK: true },
  announcements: { format: 'Bandeau', alertFormat: 'Bandeau', push: true, expiryReminderDays: 7 },
  booking: { cancelHoursBefore: 2, defaultCapacity: 16, waitlist: true },
  discounts: { '3': 5, '6': 10, '12': 15 },
};

export function mergeConfig(raw: unknown): OrganizationConfig {
  const r = (raw ?? {}) as Partial<OrganizationConfig>;
  return {
    contact: { ...DEFAULT_ORGANIZATION_CONFIG.contact, ...r.contact },
    hours: Array.isArray(r.hours) && r.hours.length === 7 ? r.hours : DEFAULT_ORGANIZATION_CONFIG.hours,
    paymentMethods: { ...DEFAULT_ORGANIZATION_CONFIG.paymentMethods, ...r.paymentMethods },
    announcements: { ...DEFAULT_ORGANIZATION_CONFIG.announcements, ...r.announcements },
    booking: { ...DEFAULT_ORGANIZATION_CONFIG.booking, ...r.booking },
    discounts: { ...DEFAULT_ORGANIZATION_CONFIG.discounts, ...r.discounts },
  };
}

export async function readOrganizationConfig(prisma: Pick<PrismaService, 'organizationSettings'>): Promise<OrganizationConfig> {
  const row = await prisma.organizationSettings.findFirst({ select: { config: true } });
  return mergeConfig(row?.config);
}
