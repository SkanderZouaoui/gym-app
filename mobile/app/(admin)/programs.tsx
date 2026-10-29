import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useReviewPrograms } from '../../src/hooks/useAdmin';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { ScreenTitle } from '../../src/components/ui';
import { ExercisesView } from '../../src/components/training/views/ExercisesView';
import type { ProgramStatus } from '../../src/hooks/useCoachSessions';

type Segment = 'PENDING' | 'APPROVED' | 'REJECTED' | 'exercises';
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'PENDING', label: 'À valider' },
  { value: 'APPROVED', label: 'Publiés' },
  { value: 'REJECTED', label: 'Refusés' },
  { value: 'exercises', label: 'Exercices' },
];

const BADGE: Record<ProgramStatus, { label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  PENDING: { label: 'À valider', icon: 'hourglass-top' },
  APPROVED: { label: 'Publié', icon: 'check-circle' },
  REJECTED: { label: 'Refusé', icon: 'cancel' },
};

/** Programmes (admin) : validation des programmes proposés par les coachs, programmes publiés, bibliothèque. */
export default function AdminProgramsScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: programs, refetch } = useReviewPrograms();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [segment, setSegment] = useState<Segment>('PENDING');

  const list = (programs ?? []).filter((p) => segment !== 'exercises' && p.status === segment);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle title="Programmes" subtitle="Validation, publication et bibliothèque" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments}>
          {SEGMENTS.map((s) => {
            const active = s.value === segment;
            const count = s.value === 'exercises' ? null : (programs ?? []).filter((p) => p.status === s.value).length;
            return (
              <Pressable key={s.value} onPress={() => setSegment(s.value)} style={styles.pill}>
                {active ? (
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : null}
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{count !== null ? `${s.label} (${count})` : s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {segment === 'exercises' ? (
          <ExercisesView />
        ) : (
          <View style={{ gap: 10 }}>
            {list.map((p) => {
              const sets = p.days.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0), 0);
              const badge = BADGE[p.status];
              return (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
                  onPress={() => router.push(`/(admin)/program/${p.id}`)}
                >
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardIcon}>
                    <MaterialIcons name="fitness-center" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardName} numberOfLines={2}>{p.name}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {p.createdBy.firstName} {p.createdBy.lastName} · {sets} séries{p.level ? ` · ${p.level}` : ''}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: p.status === 'APPROVED' ? colors.successSoft : p.status === 'REJECTED' ? colors.dangerSoft : colors.warningSoft },
                      ]}
                    >
                      <MaterialIcons
                        name={badge.icon}
                        size={14}
                        color={p.status === 'APPROVED' ? colors.successInk : p.status === 'REJECTED' ? colors.dangerInk : colors.warningInk}
                      />
                      <Text
                        style={[
                          styles.badgeText,
                          { color: p.status === 'APPROVED' ? colors.successInk : p.status === 'REJECTED' ? colors.dangerInk : colors.warningInk },
                        ]}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
                </Pressable>
              );
            })}
            {list.length === 0 ? (
              <View style={[styles.empty, cardShadow]}>
                <MaterialIcons name="task-alt" size={34} color={colors.primaryInk} />
                <Text style={styles.emptyText}>
                  {segment === 'PENDING' ? 'Aucun programme en attente' : segment === 'APPROVED' ? 'Aucun programme publié' : 'Aucun programme refusé'}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    segments: { gap: 8 },
    pill: {
      height: 36, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    pillText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    pillTextActive: { color: colors.primaryContrast },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    cardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    cardName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    cardMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
    badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
