import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useSessions } from '../../../src/hooks/useClasses';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { DaySelector } from '../../../src/components/adherent/DaySelector';
import { BottomSheet, ScreenTitle, SkeletonList } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { useCancelSession } from '../../../src/hooks/useAdmin';
import { SessionPlanningCard, sessionState } from '../../../src/components/staff/SessionPlanningCard';
import { useNow } from '../../../src/hooks/useNow';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../../src/i18n';
import { WEEKDAYS_SHORT_SUN } from '../../../src/i18n/labels';

const WEEKDAYS = WEEKDAYS_SHORT_SUN;

function buildDays(count: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return { label: WEEKDAYS[date.getDay()], dayNumber: String(date.getDate()), date };
  });
}

/** Planning (admin) : cours du jour en cartes (comme l'accueil), détail au clic, bouton de modification — FitZone Mobile Admin v2. */
export default function AdminPlanningScreen() {
  useTranslation();
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: sessions, refetch, isLoading } = useSessions();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const now = useNow();
  const days = useMemo(() => buildDays(14), []);
  const [selected, setSelected] = useState(0);
  const [toCancel, setToCancel] = useState<string | null>(null);
  const cancelSession = useCancelSession();

  const day = days[selected].date;
  const list = useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => new Date(s.startsAt).toDateString() === day.toDateString())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [sessions, day],
  );
  const dayLabel = day.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        {...tabBarScroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenTitle
          title={i18n.t('common.planning')}
          subtitle={i18n.t('admin.cours', { v0: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), length: list.length })}
          right={
            <Pressable
              accessibilityLabel={i18n.t('admin.ajouter_un_cours')}
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

        <View style={{ gap: 12 }}>
          {list.map((s) => (
            <SessionPlanningCard
              key={s.id}
              session={s}
              now={now}
              onPress={() => router.push({ pathname: '/(admin)/session/[id]', params: { id: s.id } } as never)}
              action={
                sessionState(s, now).key === 'live' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t('admin.annuler_le_cours')}
                  onPress={() => setToCancel(s.id)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.editBtn, { backgroundColor: colors.danger }, pressed && { transform: [{ scale: 0.92 }] }]}
                >
                  <MaterialIcons name="event-busy" size={22} color="#FFFFFF" />
                </Pressable>
                ) : new Date(s.startsAt).getTime() > now && s.status !== 'CANCELLED' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t('admin.modifier_le_cours')}
                  onPress={() => router.push({ pathname: '/(admin)/course-form', params: { id: s.id } })}
                  hitSlop={6}
                  style={({ pressed }) => [styles.editBtn, pressed && { transform: [{ scale: 0.92 }] }]}
                >
                  <MaterialIcons name="edit" size={22} color={colors.primaryContrast} />
                </Pressable>
                ) : null
              }
            />
          ))}
          {isLoading ? <SkeletonList count={3} height={96} /> : list.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="event-busy" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>{i18n.t('common.aucun_cours_ce_jour_la')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet visible={!!toCancel} onClose={() => setToCancel(null)}>
        <Text style={styles.sheetTitle}>{i18n.t('admin.annuler_ce_cours')}</Text>
        <Text style={styles.sheetText}>{i18n.t('admin.annuler_cours_en_cours_texte')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={i18n.t('admin.oui_annuler_le_cours')}
            variant="secondary"
            loading={cancelSession.isPending}
            onPress={() => toCancel && cancelSession.mutate(toCancel, { onSuccess: () => setToCancel(null) })}
          />
          <Button label={i18n.t('admin.garder_le_cours')} variant="outline" onPress={() => setToCancel(null)} />
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
    editBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
