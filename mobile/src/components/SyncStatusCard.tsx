import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, FadeInDown, FadeOut, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSyncStatus } from '../hooks/useSyncStatus';

/** Carte de synchronisation (maquette « Synchronisation & envoi ») : ce que l'utilisateur a enregistré ou modifié
 * hors ligne et qui n'a pas encore atteint le serveur.
 * - hors ligne : « N en attente · Envoi automatique au retour du réseau » (nuage qui clignote) ;
 * - en ligne, envoi en cours : même carte avec un liseré violet qui glisse ;
 * - file vidée : « Tout est synchronisé » en vert, brièvement. Rien n'est affiché sinon. */
export function SyncStatusCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const { phase, pending } = useSyncStatus();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const blink = useSharedValue(1);
  const slide = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (phase === 'waiting' && !reduceMotion) {
      blink.value = withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false);
    } else {
      blink.value = 1;
    }
    if (phase === 'sending' && !reduceMotion) {
      slide.value = 0;
      slide.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, false);
    } else {
      slide.value = 0;
    }
  }, [phase, reduceMotion, blink, slide]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(slide.value, [0, 1], [-trackWidth * 0.4, trackWidth]) }],
  }));

  if (phase === 'idle') return null;

  if (phase === 'done') {
    return (
      <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOut.duration(220)} style={styles.doneCard} accessibilityRole="alert">
        <MaterialIcons name="cloud-done" size={22} color={colors.successInk} />
        <Text style={[styles.title, { color: colors.successInk }]}>{t('common.sync_done')}</Text>
      </Animated.View>
    );
  }

  const sending = phase === 'sending';
  return (
    <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOut.duration(220)} style={styles.card} accessibilityRole="alert">
      <View style={styles.row}>
        <Animated.View style={blinkStyle}>
          <MaterialIcons name={sending ? 'sync' : 'cloud-upload'} size={22} color={sending ? colors.primary : colors.warningInk} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{sending ? t('common.sync_sending') : t('common.sync_pending', { count: pending })}</Text>
          <Text style={styles.sub}>{sending ? t('common.sync_pending', { count: pending }) : t('common.sync_auto')}</Text>
        </View>
      </View>
      {sending ? (
        <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}>
          <Animated.View style={[styles.indicator, { width: Math.max(trackWidth * 0.4, 1) }, slideStyle]}>
            <LinearGradient colors={['#8B5CF6', '#C4B5FD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      ) : null}
    </Animated.View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
      paddingVertical: 12, paddingHorizontal: 14, gap: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
    indicator: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 3, overflow: 'hidden' },
    doneCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(22,163,74,0.13)',
      borderRadius: radii.lg, paddingVertical: 12, paddingHorizontal: 14,
    },
  });
}
