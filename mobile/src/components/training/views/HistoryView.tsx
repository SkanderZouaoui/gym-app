import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '../../../utils/haptics';
import { EmptyState, SectionHeader, SkeletonBlock } from '../../ui';
import { fonts, radii } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useWeeklyGoal, weekStart } from '../../../hooks/useWeeklyGoal';
import { formatDurationLabel } from '../../../utils/duration';
import { dateLocale } from '../../../i18n';

type Filter = 'all' | 'workout' | 'class';
const PAGE = 20;

/** Historique complet : toutes les séances de musculation et tous les cours suivis, filtrables, regroupés par mois.
 * Utilisé dans l'onglet Entraînement et sur l'écran Historique (accès depuis Activité et Objectif). */
export function HistoryView() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { sessions, isLoading } = useWeeklyGoal();
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);
  const reduceMotion = useReducedMotion();

  // Pastille qui glisse sous l'onglet choisi.
  const [segWidth, setSegWidth] = useState(0);
  const itemW = segWidth > 0 ? (segWidth - 8 - 8) / 3 : 0;
  const thumbX = useSharedValue(0);
  const filterIndex = filter === 'all' ? 0 : filter === 'workout' ? 1 : 2;
  useEffect(() => {
    thumbX.value = reduceMotion ? 4 + filterIndex * (itemW + 4) : withTiming(4 + filterIndex * (itemW + 4), { duration: 280, easing: Easing.bezier(0.3, 0.9, 0.3, 1) });
  }, [filterIndex, itemW, reduceMotion, thumbX]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX.value }] }));

  const filtered = useMemo(() => (filter === 'all' ? sessions : sessions.filter((s) => s.kind === filter)), [sessions, filter]);
  const visible = filtered.slice(0, shown);
  const groups = useMemo(() => {
    const out: { key: string; label: string; list: typeof visible }[] = [];
    for (const s of visible) {
      const key = `${s.date.getFullYear()}-${s.date.getMonth()}`;
      const last = out[out.length - 1];
      if (last?.key === key) last.list.push(s);
      else out.push({ key, label: s.date.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }), list: [s] });
    }
    return out;
  }, [visible]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t('member.history_all'), count: sessions.length },
    { key: 'workout', label: t('member.history_workouts_short'), count: sessions.filter((s) => s.kind === 'workout').length },
    { key: 'class', label: t('member.history_classes'), count: sessions.filter((s) => s.kind === 'class').length },
  ];

  const thisMonthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  const thisMonth = sessions.filter((s) => `${s.date.getFullYear()}-${s.date.getMonth()}` === thisMonthKey).length;
  // Trois derniers mois : nombre de séances, rythme par semaine, temps total.
  const stats = useMemo(() => {
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    const recent = sessions.filter((x) => x.date >= from);
    const weeks = new Set(recent.map((x) => weekStart(x.date)));
    const seconds = recent.reduce((n, x) => n + (x.durationSeconds ?? 0), 0);
    return {
      count: recent.length,
      perWeek: weeks.size > 0 ? (recent.length / weeks.size).toFixed(1) : '0',
      hours: seconds > 0 ? `${(seconds / 3600).toFixed(seconds >= 36000 ? 0 : 1)}h` : '—',
    };
  }, [sessions]);
  const timeOf = (d: Date) => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

  // Données pas encore chargées : squelette de la page (carte du haut, onglets, lignes), pas des compteurs à 0.
  if (isLoading && sessions.length === 0) {
    return (
      <View style={styles.container}>
        <SkeletonBlock height={170} radius={radii.xl} />
        <SkeletonBlock height={50} radius={radii.full} />
        <SkeletonBlock height={20} width={140} radius={radii.xs} />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} height={88} radius={radii.lg} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroDeco} />
      <Text style={styles.heroValue}>{sessions.length}</Text>
      <Text style={styles.heroLabel}>{t('member.activity_sessions')}</Text>
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <MaterialIcons name="fitness-center" size={16} color="#FFFFFF" />
          <Text style={styles.heroStatText}>{filters[1].count} {t('member.history_workouts')}</Text>
        </View>
        <View style={styles.heroStat}>
          <MaterialIcons name="groups" size={16} color="#FFFFFF" />
          <Text style={styles.heroStatText}>{filters[2].count} {t('member.history_classes')}</Text>
        </View>
        <View style={styles.heroStat}>
          <MaterialIcons name="calendar-today" size={14} color="#FFFFFF" />
          <Text style={styles.heroStatText}>{thisMonth} {t('member.history_this_month')}</Text>
        </View>
      </View>
      <View style={styles.heroDivider} />
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <MaterialIcons name="speed" size={15} color="#FFFFFF" />
          <Text style={styles.heroStatText}>{stats.perWeek} {t('member.par_semaine')}</Text>
        </View>
        <View style={styles.heroStat}>
          <MaterialIcons name="schedule" size={15} color="#FFFFFF" />
          <Text style={styles.heroStatText}>{stats.hours} {t('member.au_total')}</Text>
        </View>
      </View>

    </LinearGradient>

    <View style={styles.segment} onLayout={(e) => setSegWidth(e.nativeEvent.layout.width)}>
      {itemW > 0 ? <Animated.View pointerEvents="none" style={[styles.thumb, { width: itemW }, thumbStyle]} /> : null}
      {filters.map((f) => {
        const on = f.key === filter;
        return (
          <Pressable key={f.key} onPress={() => { if (f.key === filter) return; haptics.selection(); setFilter(f.key); setShown(PAGE); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.segItem}>
            <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{f.label}</Text>
            <View style={[styles.segBadge, on && styles.segBadgeOn]}><Text style={[styles.segBadgeText, on && styles.segBadgeTextOn]}>{f.count}</Text></View>
          </Pressable>
        );
      })}
    </View>

    <View style={{ gap: 14 }}>
    {filtered.length === 0 ? (
      <EmptyState icon="history" title={t('member.history_empty_title')} text={t('member.history_empty_text')} tone="muted" />
    ) : (
      groups.map((g) => (
        <View key={g.key} style={{ gap: 10 }}>
          <SectionHeader title={g.label} meta={t(g.list.length === 1 ? 'member.history_count_one' : 'member.history_count_other', { count: g.list.length })} style={styles.section} />
          {g.list.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(s.href as never)} style={({ pressed }) => [styles.row, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}>
              <LinearGradient colors={[colors.deep, colors.deepPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dateTile}>
                <Text style={styles.dateDay}>{s.date.getDate()}</Text>
                <Text style={styles.dateWeekday}>{s.date.toLocaleDateString(dateLocale(), { weekday: 'short' }).replace('.', '')}</Text>
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{s.title || t(s.kind === 'class' ? 'member.goal_class' : 'member.goal_workout')}</Text>
                  {s.isRecord ? (
                    <View style={styles.recordBadge}>
                      <MaterialIcons name="emoji-events" size={11} color="#3A2500" />
                      <Text style={styles.recordBadgeText}>{t('member.record')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rowMeta} numberOfLines={1}>{[timeOf(s.date), s.durationSeconds ? formatDurationLabel(s.durationSeconds) : null, s.subtitle].filter(Boolean).join(' · ')}</Text>
                <View style={styles.kindPill}>
                  <MaterialIcons name={s.kind === 'class' ? 'groups' : 'fitness-center'} size={12} color={colors.primaryInk} />
                  <Text style={styles.kindText}>{t(s.kind === 'class' ? 'member.history_classes' : 'member.history_workouts')}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ))
    )}
    </View>

    {filtered.length > shown ? (
      <Pressable onPress={() => setShown((n) => n + PAGE)} accessibilityRole="button" style={({ pressed }) => [styles.more, pressed && { opacity: 0.7 }]}>
        <Text style={styles.moreText}>{t('member.history_more')}</Text>
        <MaterialIcons name="expand-more" size={20} color={colors.primaryInk} />
      </Pressable>
    ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { gap: 14 },
    hero: { borderRadius: radii.xl, padding: 22, overflow: 'hidden', gap: 2 },
    heroDeco: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' },
    heroValue: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, letterSpacing: -2, color: '#FFFFFF' },
    heroLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' },
    heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.full, backgroundColor: 'rgba(255,255,255,0.16)' },
    heroStatText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: '#FFFFFF' },
    segment: { flexDirection: 'row', padding: 4, gap: 4, position: 'relative', borderRadius: radii.full, backgroundColor: colors.surface2 },
    segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, borderRadius: radii.full },
    thumb: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: radii.full, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    segBadge: { minWidth: 22, paddingHorizontal: 6, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border },
    segBadgeOn: { backgroundColor: colors.deep },
    segBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.muted },
    segBadgeTextOn: { color: '#FFFFFF' },
    segText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.muted, flexShrink: 1 },
    segTextOn: { color: colors.text },
    section: { marginTop: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    dateTile: { width: 56, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dateDay: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: '#FFFFFF' },
    dateWeekday: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' },
    heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 14 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    recordBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FBBF24', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    recordBadgeText: { fontFamily: fonts.bodyBold, fontSize: 9.5, letterSpacing: 0.3, color: '#3A2500' },
    rowTitle: { flexShrink: 1, fontFamily: fonts.headBold, fontSize: 15.5, letterSpacing: -0.2, color: colors.text },
    rowMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    kindPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.full, backgroundColor: colors.primarySoft, marginTop: 2 },
    kindText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primaryInk },
    more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 50, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
    moreText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
  });
}
