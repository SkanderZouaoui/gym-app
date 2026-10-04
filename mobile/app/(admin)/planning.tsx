import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe } from '../../src/hooks/useMe';
import { useSessions } from '../../src/hooks/useClasses';
import { apiRequest } from '../../src/api/client';

export default function AdminPlanningScreen() {
  const { data: user } = useMe();
  const { data: sessions } = useSessions(user?.homeBranchId ?? undefined);
  const queryClient = useQueryClient();

  const cancelSession = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/v1/admin/sessions/${id}/cancel`, { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes', 'sessions'] }),
  });

  const confirmCancel = (id: string, name: string) => {
    Alert.alert('Annuler le cours', `Annuler "${name}" ? Les inscrits seront notifiés.`, [
      { text: 'Retour', style: 'cancel' },
      { text: 'Annuler le cours', style: 'destructive', onPress: () => cancelSession.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning</Text>
      </View>
      <FlatList
        data={sessions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.className}>{item.classType.name}</Text>
              <Text style={styles.meta}>
                {new Date(item.startsAt).toLocaleString('fr-FR', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {' · '}
                {item._count.bookings}/{item.capacity}
              </Text>
            </View>
            <Pressable onPress={() => confirmCancel(item.id, item.classType.name)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun cours programmé.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.secondary },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  className: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  cancelButton: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.xs,
    backgroundColor: colors.dangerSoft,
  },
  cancelButtonText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.dangerInk },
});
