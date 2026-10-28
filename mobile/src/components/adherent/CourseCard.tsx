import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type CourseStatusTone = 'success' | 'warning' | 'danger' | 'muted';

interface CourseCardProps {
  time: string;
  duration: string;
  name: string;
  meta: string;
  spotsLabel: string;
  statusTone: CourseStatusTone;
  progress: number;
  ctaLabel: string;
  booked?: boolean;
  onPress?: () => void;
  onPressCta?: () => void;
}

/** Carte de cours utilisée dans Planning (vue Jour) — FitZone App Adherent.dc.html, B2. */
export function CourseCard({
  time, duration, name, meta, spotsLabel, statusTone, progress, ctaLabel, booked, onPress, onPressCta,
}: CourseCardProps) {
  const { colors, cardShadow } = useTheme();
  const { styles, toneSoft, toneInk } = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.timeCol}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: toneSoft[statusTone] }]}>
          <Text style={[styles.tagText, { color: toneInk[statusTone] }]}>{booked ? `✓ ${spotsLabel}` : spotsLabel}</Text>
        </View>
      </View>
      <Pressable
        onPress={onPressCta}
        style={({ pressed }) => [styles.cta, booked && styles.ctaOutline, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        {!booked ? (
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <Text style={[styles.ctaText, booked && styles.ctaTextOutline]}>{ctaLabel}</Text>
      </Pressable>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const toneSoft: Record<CourseStatusTone, string> = {
    success: colors.surface2,
    warning: colors.warningSoft,
    danger: colors.dangerSoft,
    muted: colors.surface2,
  };
  const toneInk: Record<CourseStatusTone, string> = {
    success: colors.muted,
    warning: colors.warningInk,
    danger: colors.dangerInk,
    muted: colors.muted,
  };
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      padding: 14, gap: 12,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    timeCol: { width: 56, gap: 2 },
    time: { ...typography.title, fontSize: 18, color: colors.text },
    duration: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
    name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    tag: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 12 },
    cta: { height: 44, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    ctaOutline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
    ctaTextOutline: { color: colors.text },
  });
  return { styles, toneSoft, toneInk };
}
