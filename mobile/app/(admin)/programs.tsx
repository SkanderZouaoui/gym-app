import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { muscleGroupLabel } from '../../src/constants/muscleGroups';
import { muscleIcon, useAdminExercises, useReviewPrograms } from '../../src/hooks/useAdmin';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { ScreenTitle } from '../../src/components/ui';
import type { ProgramStatus } from '../../src/hooks/useCoachSessions';

type Segment = 'PENDING' | 'APPROVED' | 'REJECTED';
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'PENDING', label: 'À valider' },
  { value: 'APPROVED', label: 'Publiés' },
  { value: 'REJECTED', label: 'Refusés' },
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

  const { data: exercises } = useAdminExercises();
  const list = (programs ?? []).filter((p) => p.status === segment);
  const groups = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of exercises ?? []) if (e.isActive && e.muscleGroup) map.set(e.muscleGroup, (map.get(e.muscleGroup) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => muscleGroupLabel(a[0]).localeCompare(muscleGroupLabel(b[0]), 'fr'));
  }, [exercises]);
  const totalExercises = (exercises ?? []).filter((e) => e.isActive).length;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle
          title="Programmes"
          subtitle="Validation, publication et bibliothèque"
          right={
            <Pressable
              accessibilityLabel="Nouveau programme"
              onPress={() => router.push('/(admin)/program-new')}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="add" size={26} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments}>
          {SEGMENTS.map((s) => {
            const active = s.value === segment;
            const count = (programs ?? []).filter((p) => p.status === s.value).length;
            return (
              <Pressable key={s.value} onPress={() => setSegment(s.value)} style={styles.pill}>
                {active ? (
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : null}
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{`${s.label} (${count})`}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

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

        <Text style={styles.libTitle}>Bibliothèque par groupe musculaire</Text>
        <Pressable
          style={({ pressed }) => [styles.allRow, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => router.push('/(admin)/exercises')}
        >
          <View style={styles.allIcon}>
            <MaterialIcons name="view-list" size={22} color={colors.primaryInk} />
          </View>
          <Text style={styles.allText}>Voir tous les exercices</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{totalExercises}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>

        <View style={styles.groupGrid}>
          {groups.map(([name, count]) => (
            <Pressable
              key={name}
              style={({ pressed }) => [styles.groupCard, cardShadow, pressed && { transform: [{ scale: 0.97 }] }]}
              onPress={() => router.push({ pathname: '/(admin)/exercises', params: { group: name } })}
            >
              <View style={styles.groupIcon}>
                <MaterialIcons name={muscleIcon(name)} size={22} color={colors.primaryInk} />
              </View>
              <Text style={styles.groupName} numberOfLines={1}>{muscleGroupLabel(name)}</Text>
              <Text style={styles.groupCount}>{count} exercice{count > 1 ? 's' : ''}</Text>
            </Pressable>
          ))}
        </View>
        {groups.length === 0 ? <Text style={styles.emptyText}>Aucun exercice dans la bibliothèque.</Text> : null}
        <Text style={styles.hint}>Touchez une zone pour voir ses exercices</Text>
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
    addShadow: { borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6 },
    addButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    libTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginTop: 14 },
    allRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    allIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    allText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    countPill: { minWidth: 30, height: 26, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    countText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    groupCard: { width: '48%', padding: 14, gap: 4, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    groupIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: 4 },
    groupName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    groupCount: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
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
