import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMemberSearch } from '../../src/hooks/useStaff';
import { apiRequest } from '../../src/api/client';

export default function AdminMembersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const { data: results } = useMemberSearch(query);
  const queryClient = useQueryClient();

  const toggleStatus = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      apiRequest(`/v1/members/${id}/${suspend ? 'suspend' : 'reactivate'}`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', 'search'] }),
  });

  const confirmToggle = (id: string, name: string, isActive: boolean) => {
    Alert.alert(
      isActive ? 'Suspendre' : 'Réactiver',
      `${isActive ? 'Suspendre' : 'Réactiver'} le compte de ${name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => toggleStatus.mutate({ id, suspend: isActive }) },
      ],
    );
  };

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
        renderItem={({ item }) => {
          const isActive = item.status === 'ACTIVE';
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.meta}>{item.phone ?? item.email ?? ''}</Text>
              </View>
              <Pressable
                onPress={() => confirmToggle(item.id, `${item.firstName} ${item.lastName}`, isActive)}
                style={[styles.actionButton, isActive ? styles.suspendButton : styles.reactivateButton]}
              >
                <Text style={[styles.actionText, isActive ? styles.suspendText : styles.reactivateText]}>
                  {isActive ? 'Suspendre' : 'Réactiver'}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>{query.length < 2 ? 'Tape pour chercher' : 'Aucun résultat'}</Text>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
    title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondaryInk },
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
    name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    actionButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.xs },
    suspendButton: { backgroundColor: colors.dangerSoft },
    reactivateButton: { backgroundColor: colors.successSoft },
    actionText: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
    suspendText: { color: colors.dangerInk },
    reactivateText: { color: colors.successInk },
  });
}
