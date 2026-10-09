import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type PillTone = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export function Pill({ label, tone = 'muted' }: { label: string; tone?: PillTone }) {
  const { colors } = useTheme();
  const toneStyles = useMemo(
    () =>
      ({
        primary: { bg: colors.primarySoft, ink: colors.primaryInk },
        secondary: { bg: colors.secondary, ink: colors.onSecondary },
        accent: { bg: colors.accentSoft, ink: colors.accentInk },
        success: { bg: colors.successSoft, ink: colors.successInk },
        warning: { bg: colors.warningSoft, ink: colors.warningInk },
        danger: { bg: colors.dangerSoft, ink: colors.dangerInk },
        info: { bg: colors.infoSoft, ink: colors.infoInk },
        muted: { bg: colors.surface2, ink: colors.muted },
      }) satisfies Record<PillTone, { bg: string; ink: string }>,
    [colors],
  );
  const t = toneStyles[tone];

  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
});
