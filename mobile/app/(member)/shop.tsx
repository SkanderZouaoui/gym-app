import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import { useMe } from '../../src/hooks/useMe';
import { useCancelReservation, useMyReservations, useProducts, useReserveProduct } from '../../src/hooks/useShop';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'En préparation', color: colors.warningInk, bg: colors.warningSoft },
  READY: { label: 'Prêt au retrait', color: colors.successInk, bg: colors.successSoft },
  COLLECTED: { label: 'Récupéré', color: colors.muted, bg: colors.surface2 },
  CANCELLED: { label: 'Annulé', color: colors.dangerInk, bg: colors.dangerSoft },
};

export default function ShopScreen() {
  const { data: user } = useMe();
  const { data: products } = useProducts(user?.homeBranchId ?? undefined);
  const { data: reservations } = useMyReservations();
  const reserve = useReserveProduct();
  const cancel = useCancelReservation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Boutique" />
      <FlatList
        data={products ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          reservations && reservations.filter((r) => r.status !== 'CANCELLED' && r.status !== 'COLLECTED').length > 0 ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              <Text style={styles.sectionTitle}>Mes réservations</Text>
              {reservations
                .filter((r) => r.status !== 'CANCELLED' && r.status !== 'COLLECTED')
                .map((r) => {
                  const status = STATUS_LABELS[r.status]
                  return (
                    <View key={r.id} style={styles.card}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{r.product.name}</Text>
                        <Text style={styles.productMeta}>Quantité : {r.quantity}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                      </View>
                      <Pressable onPress={() => cancel.mutate(r.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                        <Text style={styles.cancelText}>Annuler</Text>
                      </Pressable>
                    </View>
                  )
                })}
              <Text style={styles.sectionTitle}>Catalogue</Text>
            </View>
          ) : (
            <Text style={styles.sectionTitle}>Catalogue</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.name}</Text>
              {item.description ? <Text style={styles.productMeta}>{item.description}</Text> : null}
              <Text style={styles.productPrice}>{item.price} DT</Text>
            </View>
            <Pressable
              onPress={() => reserve.mutate(item.id)}
              disabled={item.stock <= 0}
              style={[styles.reserveButton, item.stock <= 0 && styles.reserveButtonDisabled]}
            >
              <Text style={styles.reserveButtonText}>{item.stock > 0 ? 'Réserver' : 'Épuisé'}</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun produit disponible pour le moment.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: 120 },
  sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text, marginBottom: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  productName: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
  productMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  productPrice: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk, marginTop: 2 },
  reserveButton: { backgroundColor: colors.primarySoft, borderRadius: radii.xs, paddingHorizontal: 12, paddingVertical: 8 },
  reserveButtonDisabled: { backgroundColor: colors.surface2 },
  reserveButtonText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  cancelText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.dangerInk },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 40 },
});
