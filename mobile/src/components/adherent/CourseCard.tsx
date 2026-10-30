import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { ProgressBar } from '../ui';
import { useTranslation } from 'react-i18next';

export type CourseStatusTone = 'success' | 'warning' | 'danger' | 'muted';

interface CourseCardProps {
  time: string;
  duration: string;
  name: string;
  coach?: string;
  room?: string;
  capacity: number;
  booked_count: number;
  spotsLabel: string;
  statusTone: CourseStatusTone;
  progress: number;
  ctaLabel: string;
  /** L'adhérent a déjà une place (ou est en liste d'attente) sur ce cours. */
  booked?: boolean;
  /** Cours commencé : plus de réservation possible. */
  closed?: boolean;
  onPress?: () => void;
  onPressCta?: () => void;
}

/** Carte de cours du planning adhérent (même structure que celle de l'accueil). */
export function CourseCard({
  time, duration, name, coach, room, capacity, booked_count, spotsLabel, statusTone, progress, ctaLabel, booked, closed, onPress, onPressCta,
}: CourseCardProps) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const { styles, toneSoft, toneInk } = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]} onPress={onPress}>
      <View style={styles.top}>
        <LinearGradient
          colors={booked ? [colors.success, colors.successInk] : closed ? [colors.muted, colors.muted] : [colors.primary, colors.primaryPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeBlock}
        >
          <Text style={styles.timeText}>{time}</Text>
          <Text style={styles.timeSub}>{duration}</Text>
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          <View style={styles.metaRow}>
            <MaterialIcons name="sports" size={14} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>{coach ?? t('common.sans_coach')}</Text>
            <MaterialIcons name="meeting-room" size={14} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>{room ?? '—'}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: toneSoft[statusTone] }]}>
            <Text style={[styles.tagText, { color: toneInk[statusTone] }]}>{spotsLabel}</Text>
          </View>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <View style={styles.fillRow}>
          <Text style={styles.fillLabel}>{t('common.remplissage')}</Text>
          <Text style={styles.fillValue}>{t('member.inscrits', { booked_count, capacity })}</Text>
        </View>
        <ProgressBar progress={progress} color={progress >= 1 ? colors.danger : progress >= 0.7 ? colors.warning : colors.primary} />
      </View>

      <Pressable
        onPress={onPressCta}
        style={({ pressed }) => [styles.cta, (booked || closed) && styles.ctaOutline, closed && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        {!booked && !closed ? (
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        {booked ? <MaterialIcons name="check-circle" size={18} color={colors.successInk} /> : null}
        <Text style={[styles.ctaText, (booked || closed) && styles.ctaTextOutline]}>{ctaLabel}</Text>
      </Pressable>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const toneSoft: Record<CourseStatusTone, string> = {
    success: colors.successSoft,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
    muted: colors.surface2,
  };
  const toneInk: Record<CourseStatusTone, string> = {
    success: colors.successInk,
    warning: colors.warningInk,
    danger: colors.dangerInk,
    muted: colors.muted,
  };
  const styles = StyleSheet.create({
    card: { padding: 14, gap: 14, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    top: { flexDirection: 'row', gap: 14 },
    timeBlock: { width: 68, minHeight: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    timeText: { fontFamily: fonts.head, fontSize: 20, letterSpacing: -0.6, color: '#FFFFFF' },
    timeSub: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    name: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginRight: 8, flexShrink: 1 },
    tag: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999 },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 12 },
    fillRow: { flexDirection: 'row', justifyContent: 'space-between' },
    fillLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    fillValue: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
    cta: {
      height: 48, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center',
      justifyContent: 'center', flexDirection: 'row', gap: 6,
    },
    ctaOutline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
    ctaTextOutline: { color: colors.text },
  });
  return { styles, toneSoft, toneInk };
}
