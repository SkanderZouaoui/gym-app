import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

interface BannerProps {
  tone: BannerTone;
  icon: keyof typeof MaterialIcons.glyphMap;
  title?: string;
  text: string;
}

/** Bannière d'état (erreur, avertissement, succès, info) au style des cartes de l'app : fond teinté, bordure fine,
 * pastille d'icône sur fond de carte — comme la carte « prochain cours ». Elle apparaît en glissant doucement. */
export function Banner({ tone, icon, title, text }: BannerProps) {
  const { colors } = useTheme();
  const { styles, toneStyles } = useMemo(() => makeStyles(colors), [colors]);
  const t = toneStyles[tone];

  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      exiting={FadeOut.duration(140)}
      style={[styles.row, { backgroundColor: t.bg, borderColor: t.border }]}
      accessibilityRole="alert"
    >
      <View style={styles.iconTile}>
        <MaterialIcons name={icon} size={20} color={t.ink} />
      </View>
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.title, { color: t.ink }]}>{title}</Text> : null}
        <Text style={[styles.text, { color: t.ink }, !title && styles.textAlone]}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const tone = (bg: string, ink: string) => ({ bg, ink, border: `${ink}33` });
  const toneStyles: Record<BannerTone, { bg: string; border: string; ink: string }> = {
    info: tone(colors.infoSoft, colors.infoInk),
    success: tone(colors.successSoft, colors.successInk),
    warning: tone(colors.warningSoft, colors.warningInk),
    danger: tone(colors.dangerSoft, colors.dangerInk),
  };
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    iconTile: {
      width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { fontFamily: fonts.headSemiBold, fontSize: 14, marginBottom: 1 },
    text: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
    textAlone: { fontFamily: fonts.bodySemiBold },
  });
  return { styles, toneStyles };
}
