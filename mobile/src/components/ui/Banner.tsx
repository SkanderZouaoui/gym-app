import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

interface BannerProps {
  tone: BannerTone;
  icon: keyof typeof MaterialIcons.glyphMap;
  title?: string;
  text: string;
}

export function Banner({ tone, icon, title, text }: BannerProps) {
  const { colors } = useTheme();
  const { styles, toneStyles } = useMemo(() => makeStyles(colors), [colors]);
  const t = toneStyles[tone];

  return (
    <View style={[styles.row, { backgroundColor: t.bg }]} accessibilityRole="alert">
      <MaterialIcons name={icon} size={20} color={t.ink} style={styles.icon} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.title, { color: t.ink }]}>{title}</Text> : null}
        <Text style={[styles.text, { color: t.ink }]}>{text}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const toneStyles: Record<BannerTone, { bg: string; border: string; ink: string }> = {
    info: { bg: colors.infoSoft, border: colors.infoSoft, ink: colors.infoInk },
    success: { bg: colors.successSoft, border: colors.successSoft, ink: colors.successInk },
    warning: { bg: colors.warningSoft, border: colors.warningSoft, ink: colors.warningInk },
    danger: { bg: colors.dangerSoft, border: colors.dangerSoft, ink: colors.dangerInk },
  };
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderRadius: radii.sm,
      padding: spacing.md,
    },
    icon: { marginTop: 1 },
    title: { fontFamily: fonts.bodyBold, fontSize: 13.5, marginBottom: 2 },
    text: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  });
  return { styles, toneStyles };
}
