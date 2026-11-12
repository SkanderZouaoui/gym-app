import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { fonts, radii, spacing } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { useExercises } from '../../../hooks/useCoaching';
import { EmptyState, SkeletonBlock } from '../../ui';
import { BodyMuscleMap } from '../BodyMuscleMap';
import { ExerciseGif } from '../ExerciseGif';
import { muscleGroupLabel, type BodyView } from '../../../constants/muscleGroups';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';

/** Valeur de `group` pour la liste complète, sans filtre. */
const ALL = '__all__';

const SIDES: { value: BodyView; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'front', get label() { return i18n.t('member.face'); }, icon: 'accessibility-new' },
  { value: 'back', get label() { return i18n.t('member.dos'); }, icon: 'airline-seat-recline-normal' },
];

/** Segment « Exercices » de l'onglet Entraînement, intégré (maquette v2) : bascule Face / Dos,
 * silhouette anatomique de l'app (react-native-body-highlighter), puis grille des exercices
 * du groupe choisi avec leurs démonstrations. */
export function ExercisesView() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [side, setSide] = useState<BodyView>('front');
  const [group, setGroup] = useState<string | null>(null);
  const total = useExercises().data?.length ?? 0;

  return group === ALL ? (
    <AllExercises onBack={() => setGroup(null)} />
  ) : group ? (
    <ExerciseGrid group={group} onBack={() => setGroup(null)} />
  ) : (
    <View>
      <Pressable onPress={() => setGroup(ALL)} accessibilityRole="button" style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
        <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.allCard}>
          <View style={styles.allDeco} />
          <View style={styles.allIcon}>
            <MaterialIcons name="fitness-center" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.allTitle} numberOfLines={1}>{t('member.all_exercises')}</Text>
            {total > 0 ? <Text style={styles.allSub}>{t(total === 1 ? 'member.exercises_total_one' : 'member.exercises_total_other', { count: total })}</Text> : null}
          </View>
          <View style={styles.allArrow}>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </Pressable>

      <Text style={styles.heading}>{t('member.filtrer_par_groupe_musculaire')}</Text>
      <SideToggle value={side} onChange={setSide} />
      <View style={[styles.bodyCard, cardShadow]}>
        <BodyMuscleMap view={side} selected={[]} onToggle={(g) => setGroup(g)} />
        <Text style={styles.hint}>{t('member.touchez_une_zone_pour_filtrer')}</Text>
      </View>
    </View>
  );
}

function SideToggle({ value, onChange }: { value: BodyView; onChange: (v: BodyView) => void }) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const thumbWidth = Math.max(0, (width - 8) / 2);

  // Synchronise la pastille avec la valeur (y compris au retour depuis la grille d'exercices).
  useEffect(() => {
    x.value = withTiming(value === 'front' ? 0 : thumbWidth, { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [value, thumbWidth, x]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.toggle} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.thumb, { width: thumbWidth }, thumbStyle]}>
        <LinearGradient colors={[colors.primary, colors.primaryPressed]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {SIDES.map((s) => {
        const active = s.value === value;
        return (
          <Pressable key={s.value} style={styles.toggleItem} onPress={() => onChange(s.value)}>
            <MaterialIcons name={s.icon} size={22} color={active ? '#FFFFFF' : colors.muted} />
            <Text style={[styles.toggleLabel, { color: active ? '#FFFFFF' : colors.muted }]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ExerciseGrid({ group, onBack }: { group: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: exercises, isLoading, isError, refetch } = useExercises({ muscleGroup: [group] });
  const { width } = useWindowDimensions();
  const mediaWidth = (width - spacing.lg * 2 - 10) / 2 - 30;
  const label = muscleGroupLabel(group);

  return (
    <View>
      <View style={styles.groupHeader}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('member.groupes')}</Text>
        </Pressable>
        <Text style={styles.groupName}>{label}</Text>
      </View>

      {isError ? (
        <EmptyState
          icon="cloud-off"
          title={t('member.exercices_indisponibles')}
          text={t('member.impossible_de_recuperer_les_exercices_2')}
          tone="danger"
          actionLabel={t('common.reessayer')}
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={176} radius={radii.lg} style={{ width: '48.5%' }} />)}
        </View>
      ) : (exercises ?? []).length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('member.aucun_exercice_pour_ce_groupe')}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {(exercises ?? []).map((e) => (
            <Pressable
              key={e.id}
              style={({ pressed }) => [styles.exCard, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push(`/(member)/exercises/${e.id}`)}
            >
              <View style={[styles.thumbBox, { width: mediaWidth }]}>
                <ExerciseGif uri={e.mediaKey} size={Math.min(mediaWidth, 110)} />
              </View>
              <View>
                <Text style={styles.exName} numberOfLines={2}>{e.name}</Text>
                <Text style={styles.exMeta} numberOfLines={1}>
                  {[label, e.equipment].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const PAGE = 30;

/** Liste complète de la bibliothèque, sans filtre de groupe : recherche par nom, lignes compactes, affichage progressif. */
function AllExercises({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: exercises, isLoading, isError, refetch } = useExercises();
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...(exercises ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    return q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list;
  }, [exercises, query]);

  return (
    <View>
      <View style={styles.groupHeader}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('member.groupes')}</Text>
        </Pressable>
        <Text style={styles.groupName}>{t('member.all_exercises_title')}</Text>
      </View>

      <View style={styles.search}>
        <MaterialIcons name="search" size={22} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={(v) => { setQuery(v); setShown(PAGE); }}
          placeholder={t('member.exercises_search')}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => { setQuery(''); setShown(PAGE); }} hitSlop={8} accessibilityLabel={t('member.effacer')}>
            <MaterialIcons name="close" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {isError ? (
        <EmptyState
          icon="cloud-off"
          title={t('member.exercices_indisponibles')}
          text={t('member.impossible_de_recuperer_les_exercices_2')}
          tone="danger"
          actionLabel={t('common.reessayer')}
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => <SkeletonBlock key={i} height={84} radius={radii.lg} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('member.exercises_none_found')}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.total}>{t(filtered.length === 1 ? 'member.exercises_total_one' : 'member.exercises_total_other', { count: filtered.length })}</Text>
          <View style={styles.list}>
            {filtered.slice(0, shown).map((e) => (
              <Pressable
                key={e.id}
                style={({ pressed }) => [styles.listRow, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push(`/(member)/exercises/${e.id}`)}
              >
                <View style={styles.listThumb}>
                  <ExerciseGif uri={e.mediaKey} size={56} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.exName} numberOfLines={2}>{e.name}</Text>
                  <Text style={styles.exMeta} numberOfLines={1}>
                    {[e.muscleGroup ? muscleGroupLabel(e.muscleGroup) : null, e.equipment].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
              </Pressable>
            ))}
          </View>
          {filtered.length > shown ? (
            <Pressable onPress={() => setShown((n) => n + PAGE)} accessibilityRole="button" style={({ pressed }) => [styles.allButton, { marginTop: 12 }, pressed && { opacity: 0.7 }]}>
              <Text style={styles.allButtonText}>{t('member.exercises_more')}</Text>
              <MaterialIcons name="expand-more" size={20} color={colors.primaryInk} />
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    heading: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text, marginTop: 14, marginBottom: 12 },
    toggle: {
      flexDirection: 'row', height: 52, borderRadius: 20, padding: 4,
      backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    thumb: {
      position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 16, overflow: 'hidden',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 8,
    },
    toggleItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
    toggleLabel: { fontFamily: fonts.bodyBold, fontSize: 15 },
    bodyCard: {
      marginTop: 12, paddingTop: 14, paddingBottom: 12, alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border,
    },
    allButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, marginTop: 14, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
    allButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    allCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radii.xl, overflow: 'hidden', marginTop: 4 },
    allDeco: { position: 'absolute', right: -30, top: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' },
    allIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    allTitle: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: '#FFFFFF' },
    allSub: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    allArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, marginTop: 8, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    searchInput: { flex: 1, height: '100%', fontFamily: fonts.body, fontSize: 16, color: colors.text },
    total: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted, marginTop: 14, marginBottom: 2 },
    list: { gap: 10, marginTop: 8 },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    listThumb: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface2 },
    hint: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginTop: 6 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    groupName: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    exCard: {
      width: '48.5%', padding: 14, gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg,
      borderWidth: 1, borderColor: colors.border,
    },
    thumbBox: { height: 110, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface2 },
    exName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, textTransform: 'capitalize' },
    exMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2, textTransform: 'capitalize' },
    empty: {
      marginTop: 12, padding: 28, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed',
      borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center',
    },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
