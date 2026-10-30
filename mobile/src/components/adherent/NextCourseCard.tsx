import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { dateLocale } from '../../i18n';

interface NextCourseCardProps {
  className: string;
  meta: string;
  /** ISO de début : affiché en bloc horaire (HH:mm). */
  startsAt?: string;
  countdownText?: string;
  booked?: boolean;
  onPress?: () => void;
}

/** Carte "Prochain cours" de l'Accueil adhérent v2 : bloc horaire teinté, nom, méta, chevron. */
export function NextCourseCard({ className, meta, startsAt, countdownText, onPress }: NextCourseCardProps) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const time = startsAt
    ? new Date(startsAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
    : null;
  const subtitle = [meta, countdownText].filter(Boolean).join(' · ');
  return (
    <Pressable style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]} onPress={onPress}>
      <View style={styles.time}>
        {time ? <Text style={styles.timeText}>{time}</Text> : <MaterialIcons name="local-fire-department" size={24} color={colors.primaryInk} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.className} numberOfLines={1}>{className}</Text>
        <Text style={styles.meta} numberOfLines={1}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    time: { width: 56, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    timeText: { ...typography.title, fontSize: 18, color: colors.primaryInk },
    className: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  });
}
