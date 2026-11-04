import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Button } from '../Button';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  text: string;
  tone?: 'primary' | 'danger' | 'success' | 'warning' | 'muted';
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, text, tone = 'primary', actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  const { styles, toneBg, toneInk } = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion, float]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * float.value }] }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconCircle, { backgroundColor: toneBg[tone] }, floatStyle]}>
        <MaterialIcons name={icon} size={38} color={toneInk[tone]} />
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm, width: '100%' }}>
          <Button label={actionLabel} onPress={onAction} variant={tone === 'danger' ? 'secondary' : 'primary'} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const toneBg: Record<string, string> = {
    primary: colors.primarySoft,
    danger: colors.dangerSoft,
    success: colors.successSoft,
    warning: colors.warningSoft,
    muted: colors.surface2,
  };
  const toneInk: Record<string, string> = {
    primary: colors.primaryInk,
    danger: colors.dangerInk,
    success: colors.successInk,
    warning: colors.warningInk,
    muted: colors.muted,
  };
  const styles = StyleSheet.create({
    container: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, gap: 10 },
    iconCircle: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text, textAlign: 'center' },
    text: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  });
  return { styles, toneBg, toneInk };
}
