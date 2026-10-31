import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { ProgressBar } from '../ui';
import { StatusTag } from './staffUi';
import type { ClassSessionSummary } from '../../api/types';
import i18n, { dateLocale } from '../../i18n';

/** État d'un cours dans le planning : terminé, en cours, annulé, complet, presque plein ou places disponibles. */
export function sessionState(s: ClassSessionSummary, now: number) {
  const start = new Date(s.startsAt).getTime();
  const end = new Date(s.endsAt).getTime();
  const ratio = s._count.bookings / Math.max(1, s.capacity);
  if (s.status === 'CANCELLED') return { key: 'cancelled' as const, label: i18n.t('admin.annule'), tone: 'danger' as const, ratio };
  if (end < now) return { key: 'done' as const, label: i18n.t('common.termine'), tone: 'muted' as const, ratio };
  if (start <= now) return { key: 'live' as const, label: i18n.t('common.en_cours'), tone: 'success' as const, ratio };
  if (ratio >= 1) return { key: 'full' as const, label: i18n.t('common.complet'), tone: 'danger' as const, ratio };
  if (ratio >= 0.7) return { key: 'almost' as const, label: i18n.t('common.presque_plein'), tone: 'warning' as const, ratio };
  return { key: 'open' as const, label: i18n.t('staff.places_disponibles'), tone: 'muted' as const, ratio };
}

interface Props {
  session: ClassSessionSummary;
  now: number;
  /** Appui sur la carte (ouvre le détail du cours). */
  onPress: () => void;
  /** Bouton d'accès rapide à droite de la carte (scan pour l'accueil, modifier pour l'admin). */
  action?: ReactNode;
}

/** Carte de cours du planning (accueil, admin) : heure et durée, nom, coach et salle, état, taux de remplissage. */
export function SessionPlanningCard({ session: s, now, onPress, action }: Props) {
  useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const st = sessionState(s, now);
  const minutes = Math.round((new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000);
  const time = new Date(s.startsAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  const dim = st.key === 'done' || st.key === 'cancelled';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardShadow, dim && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.cardTop}>
        <LinearGradient
          colors={st.key === 'live' ? [colors.success, colors.successInk] : st.key === 'cancelled' ? [colors.muted, colors.muted] : [colors.primary, colors.primaryPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeBlock}
        >
          <Text style={styles.timeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{time}</Text>
          <Text style={styles.timeSub}>{i18n.t('staff.min', { minutes })}</Text>
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={2}>{s.classType.name}</Text>
          <View style={styles.metaRow}>
            <MaterialIcons name="sports" size={14} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>{s.coach ? `${s.coach.user.firstName} ${s.coach.user.lastName.charAt(0)}.` : i18n.t('common.sans_coach')}</Text>
            <MaterialIcons name="meeting-room" size={14} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>{s.room?.name ?? '—'}</Text>
          </View>
          <View style={{ marginTop: 6 }}>
            <StatusTag label={st.label} tone={st.tone} />
          </View>
        </View>
        {action}
      </View>
      <View style={styles.fillBlock}>
        <View style={styles.fillRow}>
          <Text style={styles.fillLabel}>{i18n.t('common.remplissage')}</Text>
          <Text style={styles.fillValue}>{i18n.t('common.inscrits', { bookings: s._count.bookings, capacity: s.capacity })}</Text>
        </View>
        <ProgressBar progress={st.ratio} color={st.ratio >= 1 ? colors.danger : st.ratio >= 0.7 ? colors.warning : colors.primary} />
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { padding: 14, gap: 14, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: 'row', gap: 14 },
    timeBlock: { width: 68, minHeight: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    timeText: { fontFamily: fonts.head, fontSize: 20, letterSpacing: -0.6, color: '#FFFFFF' },
    timeSub: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    name: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginRight: 8, flexShrink: 1 },
    fillBlock: { gap: 8 },
    fillRow: { flexDirection: 'row', justifyContent: 'space-between' },
    fillLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    fillValue: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  });
}
