import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMemberSearch } from '../../src/hooks/useStaff';

export default function StaffMembersScreen() {
  const [query, setQuery] = useState('');
  const { data: results, isFetching } = useMemberSearch(query);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Adhérents</Text>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom ou téléphone"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <FlatList
        data={results ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.firstName[0]}
                {item.lastName[0]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.meta}>{item.phone ?? item.email ?? ''}</Text>
            </View>
            <View style={[styles.statusPill, item.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
              <Text style={styles.statusText}>{item.status === 'ACTIVE' ? 'Actif' : item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.length < 2 ? 'Tape au moins 2 caractères pour chercher' : isFetching ? 'Recherche…' : 'Aucun résultat'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 12, height: 46,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: colors.secondarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.headBold, color: colors.secondaryInk, fontSize: 13 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusActive: { backgroundColor: colors.successSoft },
  statusInactive: { backgroundColor: colors.warningSoft },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.successInk },
});
