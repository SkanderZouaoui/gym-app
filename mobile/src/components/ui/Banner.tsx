import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { Easing, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

interface BannerProps {
  tone: BannerTone;
  icon: keyof typeof MaterialIcons.glyphMap;
  title?: string;
  text: string;
  /** Affiche une croix de fermeture ; appelée aussi à la fin du minuteur (`autoHideMs`). */
  onClose?: () => void;
  /** Action à droite (« Réessayer », « Renouveler »…). */
  actionLabel?: string;
  onAction?: () => void;
  /** Minuteur : un liseré en bas se vide pendant ce délai (ms), puis la bannière se ferme via `onClose`. */
  autoHideMs?: number;
}

/** Couleurs d'état de la maquette « Feedback & états » : rouge, ambre, violet de la marque, vert. */
const TONE_COLORS = { danger: '#EF4444', warning: '#F59E0B', success: '#16A34A' } as const;

/** Bannière d'état (erreur, avertissement, succès, info) — maquette « Feedback & états », bloc 02 « Bannières » :
 * carte à bordure fine et ombre douce, pastille ronde teintée avec l'icône, titre et message, croix et action à droite,
 * liseré de minuteur en bas. Elle descend en glissant à l'apparition. */
export function Banner({ tone, icon, title, text, onClose, actionLabel, onAction, autoHideMs }: BannerProps) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const color = tone === 'info' ? colors.primary : TONE_COLORS[tone];
  const styles = useMemo(() => makeStyles(colors, dark), [colors, dark]);
  const remaining = useSharedValue(1);

  useEffect(() => {
    if (!autoHideMs) return;
    remaining.value = 1;
    remaining.value = withTiming(0, { duration: autoHideMs, easing: Easing.linear }, (finished) => {
      if (finished && onClose) runOnJS(onClose)();
    });
  }, [autoHideMs, onClose, remaining]);
  const barStyle = useAnimatedStyle(() => ({ width: `${remaining.value * 100}%` }));

  return (
    <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOut.duration(160)} style={styles.card} accessibilityRole="alert">
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: `${color}${dark ? '2E' : '22'}` }]}>
          <MaterialIcons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={[styles.text, !title && styles.textAlone]}>{text}</Text>
        </View>
        {onClose || actionLabel ? (
          <View style={styles.right}>
            {onClose ? (
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
                <MaterialIcons name="close" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
            {actionLabel ? (
              <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.action, { color }]}>{actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {autoHideMs ? (
        <View style={[styles.track, { backgroundColor: `${color}${dark ? '2E' : '22'}` }]}>
          <Animated.View style={[styles.bar, { backgroundColor: color }, barStyle]} />
        </View>
      ) : null}
    </Animated.View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], dark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      overflow: 'hidden',
      shadowColor: dark ? '#000000' : '#281458',
      shadowOpacity: dark ? 0.4 : 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 14 },
    badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    text: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
    textAlone: { fontFamily: fonts.bodySemiBold, color: colors.text, marginTop: 0 },
    right: { alignItems: 'flex-end', gap: 8 },
    action: { fontFamily: fonts.bodyBold, fontSize: 13 },
    track: { height: 3 },
    bar: { height: '100%' },
  });
}
