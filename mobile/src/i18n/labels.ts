import i18n from './index';

/**
 * Valeurs « métier » stockées en base en français (niveau, objectif, public d'une alerte) :
 * on ne les traduit jamais à l'enregistrement, seulement à l'affichage.
 */
const LEVELS: Record<string, string> = { Débutant: 'beginner', Intermédiaire: 'intermediate', Avancé: 'advanced' };
const GOALS: Record<string, string> = { 'Perte de poids': 'weight_loss', Masse: 'mass', Endurance: 'endurance', Mobilité: 'mobility' };
const AUDIENCES: Record<string, string> = { Tous: 'all', Actifs: 'active', Expirés: 'expired', Équipe: 'team', Accueil: 'staff', Coachs: 'coach' };
const ANN_AUDIENCES = ['MEMBERS', 'STAFF', 'COACH', 'TEAM', 'ALL'] as const;

export const levelLabel = (v?: string | null): string => (v && LEVELS[v] ? i18n.t(`labels.level_${LEVELS[v]}`) : v ?? '');
export const goalLabel = (v?: string | null): string => (v && GOALS[v] ? i18n.t(`labels.goal_${GOALS[v]}`) : v ?? '');
export const announcementAudienceLabel = (v?: string | null): string => (v && (ANN_AUDIENCES as readonly string[]).includes(v) ? i18n.t(`labels.ann_${v.toLowerCase()}`) : i18n.t('labels.ann_members'));
export const audienceLabel = (v?: string | null): string => (v && AUDIENCES[v] ? i18n.t(`labels.audience_${AUDIENCES[v]}`) : v ?? '');

// --- Jours et mois : noms fournis par Intl selon la langue courante -------------------------

import { dateLocale } from './index';

const tidy = (s: string) => {
  const t = s.replace(/\.$/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const dayName = (offset: number, i: number, style: 'long' | 'short' | 'narrow') =>
  tidy(new Date(2021, 0, offset + i).toLocaleDateString(dateLocale(), { weekday: style }));

/** Liste « paresseuse » : chaque entrée est calculée à la lecture, donc suit la langue courante. */
export function lazyList(n: number, fn: (i: number) => string): readonly string[] {
  return new Proxy([] as string[], {
    get(target, prop, recv) {
      if (prop === 'length') return n;
      if (typeof prop === 'string' && /^\d+$/.test(prop)) return Number(prop) < n ? fn(Number(prop)) : undefined;
      return Reflect.get(target, prop, recv);
    },
    has(target, prop) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) return Number(prop) < n;
      return Reflect.has(target, prop);
    },
  });
}

/** Indexés comme `Date.getDay()` : 0 = dimanche. */
export const WEEKDAYS_SHORT_SUN = lazyList(7, (i) => dayName(3, i, 'short'));
export const WEEKDAYS_LONG_SUN = lazyList(7, (i) => dayName(3, i, 'long'));
/** Lundi en premier : 0 = lundi. */
export const WEEKDAYS_SHORT_MON = lazyList(7, (i) => dayName(4, i, 'short'));
export const WEEKDAYS_LONG_MON = lazyList(7, (i) => dayName(4, i, 'long'));
export const MONTHS_SHORT = lazyList(12, (i) => tidy(new Date(2021, i, 1).toLocaleDateString(dateLocale(), { month: 'short' })));
export const WEEKDAYS_NARROW_SUN = lazyList(7, (i) => dayName(3, i, 'narrow'));
export const WEEKDAYS_NARROW_MON = lazyList(7, (i) => dayName(4, i, 'narrow'));
