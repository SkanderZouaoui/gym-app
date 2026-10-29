import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMembers } from '../../../src/hooks/useStaff';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';
import { useOfflineAwareRefresh } from '../../../src/hooks/useOfflineAwareRefresh';
import { ScreenTitle } from '../../../src/components/ui';
import { InitialsAvatar, StatusTag } from '../../../src/components/staff/staffUi';

/** Adhérents (accueil) : recherche, liste, ouverture de la fiche, création de compte. */
export default function StaffMembersScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const { data: members, refetch } = useMembers(query.trim());
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <ScreenTitle
          title="Adhérents"
          subtitle="Rechercher, consulter, créer un compte"
          right={
            <Pressable
              accessibilityLabel="Créer un compte"
              onPress={() => router.push('/(staff)/member-create')}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="person-add" size={24} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={24} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un adhérent…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      <FlatList
        {...tabBarScroll}
        data={members ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push(`/(staff)/member/${item.id}`)}
          >
            <InitialsAvatar first={item.firstName} last={item.lastName} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.phone ?? item.email ?? ''}</Text>
            </View>
            <StatusTag label={item.status === 'ACTIVE' ? 'Actif' : 'Inactif'} tone={item.status === 'ACTIVE' ? 'success' : 'muted'} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={[styles.empty, cardShadow]}>
            <Text style={styles.emptyText}>Aucun adhérent trouvé.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.sm },
    addShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6,
    },
    addButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 16, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, height: 52 },
    list: { paddingHorizontal: spacing.lg, gap: 10, paddingBottom: 140 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    empty: { padding: 28, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  });
}
