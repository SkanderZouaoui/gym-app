import { z } from "zod";

// ---------------------------------------------------------------------------
// Identité visuelle (branding)
// ---------------------------------------------------------------------------

export const brandingSchema = z.object({
  brand: z.string().min(1),
  primary: z.string(),
  primaryContrast: z.string(),
  secondary: z.string(),
  accent: z.string(),
  theme: z.enum(["Clair", "Sombre", "Auto"]),
  radius: z.number().int().min(4).max(24),
  font: z.enum(["Géométrique", "Sportive", "Expressive"]),
  logoPos: z.enum(["Gauche", "Centré"]),
  logoMode: z.enum(["Logo + nom", "Logo seul"]),
  density: z.enum(["Confortable", "Compacte"]),
  qrCenter: z.boolean(),
});
export type Branding = z.infer<typeof brandingSchema>;

export const DEFAULT_BRANDING: Branding = {
  brand: "MuscleUP",
  primary: "#7C3AED",
  primaryContrast: "#FFFFFF",
  secondary: "#3B1764",
  accent: "#7C3AED",
  theme: "Clair",
  radius: 16,
  font: "Géométrique",
  logoPos: "Gauche",
  logoMode: "Logo + nom",
  density: "Confortable",
  qrCenter: false,
};

export const FONT_PAIRS: Record<Branding["font"], [string, string]> = {
  Géométrique: ["Sora", "DM Sans"],
  Sportive: ["Barlow Condensed", "Barlow"],
  Expressive: ["Bricolage Grotesque", "Figtree"],
};

export const BRAND_PRESETS: Record<string, Pick<Branding, "primary" | "primaryContrast" | "secondary" | "accent">> = {
  Énergie: { primary: "#FF5A1F", primaryContrast: "#FFFFFF", secondary: "#14213D", accent: "#FCA311" },
  Calme: { primary: "#0E7C66", primaryContrast: "#FFFFFF", secondary: "#1B3A5C", accent: "#4FB3BF" },
  Premium: { primary: "#C9A24B", primaryContrast: "#111111", secondary: "#111111", accent: "#E8C872" },
  Violet: { primary: "#7C3AED", primaryContrast: "#FFFFFF", secondary: "#3B1764", accent: "#7C3AED" },
};

// ---------------------------------------------------------------------------
// Blocs de l'écran d'accueil
// ---------------------------------------------------------------------------

export const HOME_MODULE_IDS = ["announce", "qr", "next", "week", "courses"] as const;
export type HomeModuleId = (typeof HOME_MODULE_IDS)[number];

export const homeModuleSchema = z.object({
  id: z.enum(HOME_MODULE_IDS),
  on: z.boolean(),
});
export type HomeModule = z.infer<typeof homeModuleSchema>;

export const DEFAULT_HOME_MODULES: HomeModule[] = [
  { id: "announce", on: true },
  { id: "qr", on: true },
  { id: "next", on: true },
  { id: "week", on: false },
  { id: "courses", on: true },
];

// ---------------------------------------------------------------------------
// Onglets de navigation (adhérent) — un id par route de tab réellement
// présente dans mobile/app/(member)/(tabs)/. "qr" n'a pas de libellé (bouton
// central) et ne peut pas être désactivé seul : on exige home/training/profile
// toujours actifs, planning pilotable, qr piloté séparément via
// Branding.qrCenter côté navigation plutôt que via ce tableau.
// ---------------------------------------------------------------------------

export const TAB_IDS = ["home", "planning", "training", "progress", "profile"] as const;
export type TabId = (typeof TAB_IDS)[number];

export const tabSchema = z.object({
  id: z.enum(TAB_IDS),
  icon: z.string(),
  fr: z.string().min(1),
  ar: z.string(),
  on: z.boolean(),
});
export type AppTab = z.infer<typeof tabSchema>;

export const DEFAULT_TABS: AppTab[] = [
  { id: "home", icon: "home", fr: "Accueil", ar: "الرئيسية", on: true },
  { id: "planning", icon: "calendar_month", fr: "Planning", ar: "الجدول", on: true },
  { id: "training", icon: "fitness_center", fr: "Entraînement", ar: "التمارين", on: true },
  { id: "progress", icon: "monitoring", fr: "Progrès", ar: "التقدم", on: true },
  { id: "profile", icon: "person", fr: "Profil", ar: "حسابي", on: true },
];

// ---------------------------------------------------------------------------
// Textes / i18n
// ---------------------------------------------------------------------------

export const appStringSchema = z.object({
  k: z.string().min(1),
  label: z.string(),
  fr: z.string(),
  ar: z.string(),
});
export type AppString = z.infer<typeof appStringSchema>;

export const DEFAULT_STRINGS: AppString[] = [
  { k: "home.greeting", label: "Salutation", fr: "Bonjour, {prénom}", ar: "مرحبًا، {prénom}" },
  { k: "home.qr.title", label: "Carte QR · titre", fr: "Accès salle", ar: "الدخول إلى القاعة" },
  { k: "home.qr.sub", label: "Carte QR · sous-titre", fr: "Présentez ce code à l'entrée", ar: "اعرض هذا الرمز عند المدخل" },
  { k: "home.qr.cta", label: "Carte QR · bouton", fr: "Afficher mon QR", ar: "عرض رمز QR" },
  { k: "home.next", label: "Prochaine séance", fr: "Prochaine séance", ar: "الحصة القادمة" },
  { k: "home.week", label: "Activité", fr: "Cette semaine", ar: "" },
  { k: "home.suggest", label: "Suggestions", fr: "Cours à venir", ar: "الحصص القادمة" },
  { k: "cta.book", label: "Bouton réserver", fr: "Réserver", ar: "احجز" },
  { k: "plans.title", label: "Formules · titre", fr: "Nos formules", ar: "باقاتنا" },
  { k: "plans.desk", label: "Formules · mention", fr: "Souscription et règlement à l'accueil", ar: "" },
];

export const languagesSchema = z.object({
  FR: z.literal(true),
  AR: z.boolean(),
  EN: z.boolean(),
});
export type AppLanguages = z.infer<typeof languagesSchema>;

export const DEFAULT_LANGUAGES: AppLanguages = { FR: true, AR: true, EN: false };

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const AUTO_NOTIF_IDS = [
  "sessionReminder",
  "waitlistSpot",
  "membershipExpiring",
  "sessionCancelled",
  "inactivity",
] as const;
export type AutoNotifId = (typeof AUTO_NOTIF_IDS)[number];

export const autoNotifSchema = z.object({
  id: z.enum(AUTO_NOTIF_IDS),
  on: z.boolean(),
});

export const notifSettingsSchema = z.object({
  defaultAudience: z.string(),
  defaultTone: z.enum(["info", "accent", "danger"]),
  channels: z.object({ push: z.boolean(), banner: z.boolean(), email: z.boolean() }),
  autos: z.array(autoNotifSchema),
});
export type NotifSettings = z.infer<typeof notifSettingsSchema>;

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  defaultAudience: "Tous les adhérents",
  defaultTone: "info",
  channels: { push: true, banner: true, email: false },
  autos: [
    { id: "sessionReminder", on: true },
    { id: "waitlistSpot", on: true },
    { id: "membershipExpiring", on: true },
    { id: "sessionCancelled", on: true },
    { id: "inactivity", on: false },
  ],
};

// ---------------------------------------------------------------------------
// Règles de réservation & accès
// ---------------------------------------------------------------------------

export const bookingRulesSchema = z.object({
  openDays: z.number().int().min(1).max(30),
  cancelHours: z.number().int().min(0).max(48),
  maxUpcomingBookings: z.number().int().min(1).max(10),
  noShowThreshold: z.number().int().min(1).max(10),
  blockDays: z.number().int().min(1).max(30),
  checkinWindowMin: z.number().int().min(5).max(60),
  waitlistEnabled: z.boolean(),
  autoPromote: z.boolean(),
  lateCancelAsNoShow: z.boolean(),
});
export type BookingRules = z.infer<typeof bookingRulesSchema>;

export const DEFAULT_BOOKING_RULES: BookingRules = {
  openDays: 7,
  cancelHours: 4,
  maxUpcomingBookings: 3,
  noShowThreshold: 3,
  blockDays: 7,
  checkinWindowMin: 15,
  waitlistEnabled: true,
  autoPromote: true,
  lateCancelAsNoShow: true,
};

// ---------------------------------------------------------------------------
// Snapshot complet d'une version de configuration
// ---------------------------------------------------------------------------

export const appConfigContentSchema = z.object({
  branding: brandingSchema,
  homeModules: z.array(homeModuleSchema),
  tabs: z.array(tabSchema),
  strings: z.array(appStringSchema),
  languages: languagesSchema,
  notifSettings: notifSettingsSchema,
  bookingRules: bookingRulesSchema,
});
export type AppConfigContent = z.infer<typeof appConfigContentSchema>;

export const DEFAULT_APP_CONFIG_CONTENT: AppConfigContent = {
  branding: DEFAULT_BRANDING,
  homeModules: DEFAULT_HOME_MODULES,
  tabs: DEFAULT_TABS,
  strings: DEFAULT_STRINGS,
  languages: DEFAULT_LANGUAGES,
  notifSettings: DEFAULT_NOTIF_SETTINGS,
  bookingRules: DEFAULT_BOOKING_RULES,
};
