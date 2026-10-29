import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSessions } from '../../../src/hooks/useClasses';
import {
  useAdminCoaches,
  useCancelSession,
  useReplaceSessionCoach,
  useSetSessionCapacity,
} from '../../../src/hooks/useAdmin';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { BottomSheet, ProgressBar, ScreenTitle } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import type { ClassSessionSummary } from '../../../src/api/types';

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function buildDays(count: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { label: WEEKDAYS[date.getDay()], dayNumber: String(date.getDate()), date };
  });
}

/** Planning (admin) : cours du jour, capacité, remplacement de coach, annulation, édition — FitZone Mobile Admin v2. */
export default function AdminPlanningScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: sessions, refetch } = useSessions();
  const { data: coaches } = useAdminCoaches();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const setCapacity = useSetSessionCapacity();
  const replaceCoach = useReplaceSessionCoach();
  const cancel = useCancelSession();
  const days = useMemo(() => buildDays(14), []);
  const [selected, setSelected] = useState(0);
  const [coachFor, setCoachFor] = useState<ClassSessionSummary | null>(null);
  const [cancelFor, setCancelFor] = useState<ClassSessionSummary | null>(null);

  const day = days[selected].date;
  const list = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => new Date(s.startsAt).toDateString() === day.toDateString())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [sessions, day],
  );
  const dayLabel = day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const tag = (s: ClassSessionSummary) => {
    if (s.status === 'CANCELLED') return { label: 'Annulé', bg: colors.dangerSoft, fg: colors.dangerInk };
    const left = s.capacity - s._count.bookings;
    if (left <= 0) return { label: 'Complet', bg: colors.dangerSoft, fg: colors.dangerInk };
    if (s._count.bookings / Math.max(1, s.capacity) >= 0.7) return { label: 'Presque plein', bg: colors.warningSoft, fg: colors.warningInk };
    return { label: `${left} places`, bg: colors.surface2, fg: colors.muted };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle
          title="Planning"
          subtitle={`${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} · ${list.length} cours`}
          right={
            <Pressable
              accessibilityLabel="Ajouter un cours"
              onPress={() => router.push('/(admin)/course-form')}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="add" size={28} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />
        <DaySelector days={days} selectedIndex={selected} onSelect={setSelected} />

        <View style={{ gap: 10 }}>
          {list.map((s) => {
            const t = tag(s);
            const cancelled = s.status === 'CANCELLED';
            const ratio = s._count.bookings / Math.max(1, s.capacity);
            return (
              <View key={s.id} style={[styles.card, cardShadow, cancelled && { opacity: 0.6 }]}>
                <View style={styles.row}>
                  <Text style={styles.time}>{new Date(s.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{s.classType.name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {s.coach ? `${s.coach.user.firstName} ${s.coach.user.lastName.charAt(0)}.` : 'Sans coach'} · {s.room?.name ?? '—'}
                    </Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: t.bg }]}>
                    <Text style={[styles.tagText, { color: t.fg }]}>{t.label}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Modifier le cours"
                    onPress={() => router.push({ pathname: '/(admin)/course-form', params: { id: s.id } })}
                    style={styles.editBtn}
                  >
                    <MaterialIcons name="edit" size={20} color={colors.primaryInk} />
                  </Pressable>
                </View>

                <View style={{ marginTop: 12 }}>
                  <ProgressBar progress={ratio} color={ratio >= 1 ? colors.danger : ratio >= 0.7 ? colors.warning : colors.primary} />
                </View>

                {!cancelled ? (
                  <View style={styles.actions}>
                    <View style={styles.stepper}>
                      <Pressable
                        accessibilityLabel="Moins"
                        style={styles.stepBtn}
                        onPress={() => setCapacity.mutate({ id: s.id, capacity: Math.max(s._count.bookings, 1, s.capacity - 1) })}
                      >
                        <MaterialIcons name="remove" size={18} color={colors.text} />
                      </Pressable>
                      <Text style={styles.stepText}>{s.capacity} places</Text>
                      <Pressable accessibilityLabel="Plus" style={styles.stepBtn} onPress={() => setCapacity.mutate({ id: s.id, capacity: s.capacity + 1 })}>
                        <MaterialIcons name="add" size={18} color={colors.text} />
                      </Pressable>
                    </View>
                    <Pressable style={styles.pill} onPress={() => setCoachFor(s)}>
                      <Text style={styles.pillText}>Remplacer coach</Text>
                    </Pressable>
                    <Pressable style={[styles.pill, styles.pillDanger]} onPress={() => setCancelFor(s)}>
                      <Text style={[styles.pillText, { color: colors.dangerInk }]}>Annuler</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
          {list.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="event-busy" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>Aucun cours ce jour-là.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet visible={!!coachFor} onClose={() => setCoachFor(null)}>
        <Text style={styles.sheetTitle}>Remplacer le coach</Text>
        <Text style={styles.sheetText}>{coachFor?.classType.name} · choisissez le nouveau coach.</Text>
        <View style={{ gap: 8, marginTop: 6 }}>
          {(coaches ?? []).map((c) => {
            const active = coachFor?.coachId === c.userId;
            return (
              <Pressable
                key={c.userId}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => coachFor && replaceCoach.mutate({ id: coachFor.id, coachId: c.userId }, { onSuccess: () => setCoachFor(null) })}
              >
                <Text style={[styles.optionText, active && { color: colors.primaryContrast }]}>{c.user.firstName} {c.user.lastName}</Text>
                {active ? <MaterialIcons name="check" size={18} color={colors.primaryContrast} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet visible={!!cancelFor} onClose={() => setCancelFor(null)}>
        <Text style={styles.sheetTitle}>Annuler {cancelFor?.classType.name} ?</Text>
        <Text style={styles.sheetText}>
          Les {cancelFor?._count.bookings ?? 0} inscrit(s) seront prévenus et leur réservation sera annulée.
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label="Oui, annuler le cours"
            variant="secondary"
            loading={cancel.isPending}
            onPress={() => cancelFor && cancel.mutate(cancelFor.id, { onSettled: () => setCancelFor(null) })}
          />
          <Button label="Garder le cours" variant="outline" onPress={() => setCancelFor(null)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    addShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6 },
    addButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    card: { padding: 14, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    time: { width: 54, fontFamily: fonts.head, fontSize: 18, color: colors.text },
    name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
    editBtn: {
      width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    stepper: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    stepBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
    stepText: { minWidth: 62, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    pill: { height: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    pillDanger: { backgroundColor: colors.dangerSoft },
    pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    option: {
      height: 52, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  });
}
