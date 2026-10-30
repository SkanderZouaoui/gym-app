import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { ScreenTitle } from '../../../src/components/ui';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { muscleIcon, useAdminExercises } from '../../../src/hooks/useAdmin';
import { useTranslation } from 'react-i18next';
import { levelLabel } from '../../../src/i18n/labels';

/** Bibliothèque d'exercices (admin) : tous les exercices ou ceux d'un groupe musculaire, recherche, ajout. */
export default function AdminExercisesScreen() {
  const { t } = useTranslation();
  const { group } = useLocalSearchParams<{ group?: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const { data: exercises, refetch } = useAdminExercises({ muscleGroup: group });
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/programs'));

  const list = (exercises ?? []).filter((e) => !search.trim() || e.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={14}
        windowSize={9}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: 12 }}>
            <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
              <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
              <Text style={styles.backText}>{group ? t('member.groupes') : t('common.programmes')}</Text>
            </Pressable>
            <ScreenTitle
              title={group ? muscleGroupLabel(group) : t('admin.tous_les_exercices')}
              subtitle={`${list.length} exercice${list.length > 1 ? 's' : ''}`}
              right={
                <Pressable
                  accessibilityLabel={t('common.ajouter_un_exercice')}
                  onPress={() => router.push({ pathname: '/(admin)/exercises/form', params: group ? { group } : {} })}
                  style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
                >
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                    <MaterialIcons name="add" size={26} color={colors.primaryContrast} />
                  </LinearGradient>
                </Pressable>
              }
            />
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={22} color={colors.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder={t('admin.rechercher_un_exercice')} placeholderTextColor={colors.muted} style={styles.searchInput} />
            </View>
          </View>
        }
        renderItem={({ item: e }) => (
          <Pressable
            style={({ pressed }) => [styles.row, cardShadow, !e.isActive && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push(`/(admin)/exercises/${e.id}`)}
          >
            <View style={styles.rowIcon}>
              <MaterialIcons name={muscleIcon(e.muscleGroup ?? '')} size={22} color={colors.primaryInk} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={2}>{e.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[e.muscleGroup ? muscleGroupLabel(e.muscleGroup) : null, e.equipment, e.level ? levelLabel(e.level) : null].filter(Boolean).join(' · ') || '—'}{e.isActive ? '' : t('admin.desactive_2')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[styles.empty, cardShadow]}>
            <MaterialIcons name="fitness-center" size={32} color={colors.primaryInk} />
            <Text style={styles.emptyText}>{t('admin.aucun_exercice_ajoutez_en_un')}</Text>
          </View>
        }
      />
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
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, height: 52 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    rowIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 2 },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  });
}
