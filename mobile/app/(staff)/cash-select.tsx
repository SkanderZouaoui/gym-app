import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useStaffRoutes } from '../../src/navigation/staffRoutes';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMembers } from '../../src/hooks/useStaff';
import { ScreenTitle, SkeletonList } from '../../src/components/ui';
import { InitialsAvatar, StatusTag } from '../../src/components/staff/staffUi';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';

/** Nouvel encaissement, étape 1 : choisir l'adhérent à encaisser (ou créer un compte). */
export default function StaffCashSelectScreen() {
  const pullClient = useQueryClient();
  const { refreshing: pullRefreshing, onRefresh: pullOnRefresh } = useOfflineAwareRefresh(() => pullClient.invalidateQueries());
  const { t } = useTranslation();
  const routes = useStaffRoutes();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const { data: members, isLoading } = useMembers(query.trim());
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(routes.cash));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.encaissements')}</Text>
        </Pressable>
        <ScreenTitle title={t('staff.nouvel_encaissement')} subtitle={t('staff.choisissez_ladherent_a_encaisser')} />
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={24} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('staff.rechercher_un_adherent')}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={pullOnRefresh} />}
        data={members ?? []}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => router.replace({ pathname: routes.cashSell, params: { memberId: item.id } })}
          >
            <InitialsAvatar first={item.firstName} last={item.lastName} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.phone ?? item.email ?? ''}</Text>
            </View>
            <StatusTag label={item.status === 'ACTIVE' ? t('home.statusActive') : t('staff.inactif')} tone={item.status === 'ACTIVE' ? 'success' : 'muted'} />
          </Pressable>
        )}
        ListEmptyComponent={isLoading ? <SkeletonList count={6} /> : (<View style={[styles.empty, cardShadow]}>
            <Text style={styles.emptyText}>{t('common.aucun_adherent_trouve')}</Text>
          </View>)}
        ListFooterComponent={
          <Pressable style={styles.create} onPress={() => router.push(routes.memberCreate)}>
            <MaterialIcons name="person-add" size={22} color={colors.primaryInk} />
            <Text style={styles.createText}>{t('staff.creer_un_nouveau_compte')}</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.sm },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 16, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, height: 52 },
    list: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 60 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    empty: { padding: 28, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    create: {
      marginTop: 14, minHeight: 52, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
      backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    createText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
  });
}
