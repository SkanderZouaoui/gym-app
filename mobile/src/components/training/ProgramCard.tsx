import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';


interface ProgramCardProps {
  name: string;
  isOwn: boolean;
  dayCount: number;
  todayLabel?: string;
  todayExerciseCount?: number;
  onPress: () => void;
  onStart?: () => void;
  highlighted?: boolean;
  /** Petit libellé en capitales au-dessus du nom du programme à la une. */
  kicker?: string;
  /** Programme proposé à tous les adhérents (pastille « Proposé »). */
  proposed?: boolean;
}

/** Carte programme — version mise en avant (fond secondary) ou compacte,
 * FitZone App Entraînement.dc.html, D1. */
export function ProgramCard({ name, isOwn, dayCount, todayLabel, todayExerciseCount, onPress, onStart, highlighted, kicker, proposed }: ProgramCardProps) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (highlighted) {
    return (
      <Pressable style={styles.heroShadow} onPress={onPress}>
       <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroDecor} />
        <View style={styles.heroHeaderRow}>
          <Text style={styles.heroLabel}>{kicker ?? 'EN COURS'}</Text>
          <View style={styles.heroTag}><Text style={styles.heroTagText}>{proposed ? 'Proposé' : isOwn ? 'Personnel' : 'Coach'}</Text></View>
        </View>
        <Text style={styles.heroName}>{name}</Text>
        <Text style={styles.heroMeta}>{dayCount} jour{dayCount > 1 ? 's' : ''} / semaine</Text>
        {todayLabel ? (
          <View style={styles.todayRow}>
            <Text style={styles.todayText}>
              Aujourd'hui : <Text style={styles.todayBold}>{todayLabel}</Text>
              {todayExerciseCount ? ` · ${todayExerciseCount} exercices` : ''}
            </Text>
          </View>
        ) : null}
        {onStart ? (
          <Pressable style={styles.startButton} onPress={onStart}>
            <MaterialIcons name="play-arrow" size={20} color={colors.primaryInk} />
            <Text style={styles.startButtonText}>Commencer la séance</Text>
          </Pressable>
        ) : null}
       </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable style={({ pressed }) => [styles.compactCard, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]} onPress={onPress}>
      <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.compactIcon}>
        <MaterialIcons name="fitness-center" size={26} color="#FFFFFF" />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.compactTitleRow}>
          <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
          <View style={[styles.tag, isOwn ? styles.tagOwn : styles.tagCoach]}>
            <Text style={[styles.tagText, isOwn ? styles.tagTextOwn : styles.tagTextCoach]}>{proposed ? 'Proposé' : isOwn ? 'Perso' : 'Coach'}</Text>
          </View>
        </View>
        <Text style={styles.compactMeta}>{dayCount} jour{dayCount > 1 ? 's' : ''} / semaine</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    heroShadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
    },
    heroCard: { borderRadius: radii.xl, padding: 22, gap: 8, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: '#FFFFFF', opacity: 0.9 },
    heroTag: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    heroTagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    heroName: { ...typography.title, fontSize: 26, letterSpacing: -0.6, color: '#FFFFFF' },
    heroMeta: { fontFamily: fonts.body, fontSize: 14, color: '#FFFFFF', opacity: 0.92 },
    todayRow: { marginTop: 4 },
    todayText: { fontFamily: fonts.body, fontSize: 13, color: '#FFFFFF', opacity: 0.92 },
    todayBold: { fontFamily: fonts.bodyBold },
    startButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderRadius: 14, backgroundColor: '#FFFFFF', marginTop: 8, height: 46,
    },
    startButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    compactCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14,
    },
    compactIcon: {
      width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    compactTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    compactName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    compactMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    tagOwn: { backgroundColor: colors.surface2 },
    tagCoach: { backgroundColor: colors.primarySoft },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 12 },
    tagTextOwn: { color: colors.muted },
    tagTextCoach: { color: colors.primaryInk },
  });
}
