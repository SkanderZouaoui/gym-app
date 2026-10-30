import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Button } from '../../src/components/Button';
import { EmptyState, ProgressBar } from '../../src/components/ui';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { GOAL_OPTIONS, goalTarget, useUpdateWeeklyGoal, useWeeklyGoal, weekStart } from '../../src/hooks/useWeeklyGoal';
import { dateLocale } from '../../src/i18n';

/** Séances enregistrées et objectif hebdomadaire (modifiable), depuis la carte Objectif du profil. */
export default function WeeklyGoalScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { perWeek, target, done, sessions } = useWeeklyGoal();
  const update = useUpdateWeeklyGoal();
  const [choice, setChoice] = useState<string | null>(null);
  const selected = choice ?? perWeek;
  const dirty = selected !== perWeek;
  const [saved, setSaved] = useState(false);

  const thisWeek = weekStart(new Date());
  const current = sessions.filter((s) => weekStart(s.date) === thisWeek);
  const earlier = sessions.filter((s) => weekStart(s.date) !== thisWeek).slice(0, 30);

  const row = (s: (typeof sessions)[number]) => (
    <Pressable key={s.id} onPress={() => router.push(s.href as any)} style={({ pressed }) => [styles.row, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={styles.rowIcon}>
        <MaterialIcons name={s.kind === 'class' ? 'groups' : 'fitness-center'} size={22} color={colors.primaryInk} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{s.title || t(s.kind === 'class' ? 'member.goal_class' : 'member.goal_workout')}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[s.date.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' }), s.subtitle].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('member.weekly_goal')} fallbackHref="/(member)/(tabs)/profile" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.hero, cardShadow]}>
          <Text style={styles.heroValue}>{done}<Text style={styles.heroTarget}>/{target}</Text></Text>
          <Text style={styles.heroLabel}>{t('member.goal_this_week')}</Text>
          <ProgressBar progress={Math.min(1, done / Math.max(1, target))} color={colors.primary} />
          {done >= target ? <Text style={styles.reached}>{t('member.goal_reached')}</Text> : null}
        </View>

        <Text style={styles.section}>{t('member.goal_edit_title')}</Text>
        <View style={styles.chips}>
          {GOAL_OPTIONS.map((o) => {
            const on = o === selected;
            return (
              <Pressable key={o} onPress={() => { setChoice(o); setSaved(false); }} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipValue, on && { color: colors.primaryInk }]}>{o}</Text>
                <Text style={[styles.chipHint, on && { color: colors.primaryInk }]}>{t('member.goal_target_n', { n: goalTarget(o) })}</Text>
              </Pressable>
            );
          })}
        </View>
        {dirty || saved ? (
          dirty ? (
            <Button
              label={t('member.enregistrer')}
              loading={update.isPending}
              onPress={() => update.mutate(selected, { onSuccess: () => { setChoice(null); setSaved(true); } })}
            />
          ) : (
            <Text style={styles.savedText}>{t('member.goal_saved')}</Text>
          )
        ) : null}

        <Text style={styles.section}>{t('member.goal_this_week_sessions')}</Text>
        {current.length ? current.map(row) : <EmptyState icon="event-busy" title={t('member.goal_none_title')} text={t('member.goal_none_text')} tone="muted" />}

        {earlier.length ? (
          <>
            <Text style={styles.section}>{t('member.goal_earlier')}</Text>
            {earlier.map(row)}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 4, gap: 12, paddingBottom: 80 },
    hero: { padding: 20, gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    heroValue: { fontFamily: fonts.head, fontSize: 44, letterSpacing: -1, color: colors.text },
    heroTarget: { fontFamily: fonts.head, fontSize: 24, color: colors.muted },
    heroLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.muted },
    reached: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.successInk },
    section: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted, marginTop: 8 },
    chips: { flexDirection: 'row', gap: 8 },
    chip: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
    chipOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
    chipValue: { fontFamily: fonts.head, fontSize: 18, color: colors.text },
    chipHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    savedText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.successInk, textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    rowMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  });
}
