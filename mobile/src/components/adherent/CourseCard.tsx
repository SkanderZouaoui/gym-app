import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { ClassTypeIcon } from './ClassTypeIcon';
import { ProgressBar } from '../ui';

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
  const { colors } = useTheme();
  const { styles, toneColor, toneInk } = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.timeCol}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
        <ClassTypeIcon name={name} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {booked ? <View style={styles.bookedDot} /> : null}
          </View>
          <Text style={styles.meta}>{meta}</Text>
        </View>
      </View>
      <ProgressBar progress={progress} color={toneColor[statusTone]} />
      <View style={styles.footerRow}>
        <Text style={[styles.spots, { color: toneInk[statusTone] }]}>{spotsLabel}</Text>
        <Pressable onPress={onPressCta} style={[styles.cta, booked && styles.ctaOutline]}>
          <Text style={[styles.ctaText, booked && styles.ctaTextOutline]}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const toneColor: Record<CourseStatusTone, string> = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    muted: colors.borderStrong,
  };
  const toneInk: Record<CourseStatusTone, string> = {
    success: colors.successInk,
    warning: colors.warningInk,
    danger: colors.dangerInk,
    muted: colors.muted,
  };
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    timeCol: { width: 46, gap: 2 },
    time: { fontFamily: fonts.headBold, fontSize: 15, color: colors.text },
    duration: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    bookedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
    meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    spots: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
    cta: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    ctaOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.borderStrong },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryContrast },
    ctaTextOutline: { color: colors.text },
  });
  return { styles, toneColor, toneInk };
}
