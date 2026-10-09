import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMyReservations, useProducts, useReserveProduct } from '../../src/hooks/useShop';
import { Banner, EmptyState, Pill } from '../../src/components/ui';
import { ProductCard } from '../../src/components/adherent/ProductCard';

const STATUS_TONE: Record<string, 'warning' | 'success' | 'muted' | 'danger'> = {
  PENDING: 'warning',
  READY: 'success',
  COLLECTED: 'muted',
  CANCELLED: 'danger',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En préparation',
  READY: 'Prêt au retrait',
  COLLECTED: 'Récupéré',
  CANCELLED: 'Annulé',
};

export default function ShopScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: products } = useProducts();
  const { data: reservations } = useMyReservations();
  const reserve = useReserveProduct();

  const activeReservations = reservations?.filter((r) => r.status !== 'CANCELLED' && r.status !== 'COLLECTED') ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Boutique" />
      <FlatList
        data={products ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <Banner
              tone="info"
              icon="storefront"
              text="Réservez dans l’app, payez et retirez à l’accueil (espèces, carte ou chèque)."
            />
            {activeReservations.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.sectionTitle}>Mes réservations</Text>
                {activeReservations.map((r) => (
                  <View key={r.id} style={styles.reservationCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{r.product.name}</Text>
                      <Text style={styles.productMeta}>Quantité : {r.quantity}</Text>
                    </View>
                    <Pill label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>Catalogue</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            name={item.name}
            price={item.price}
            stock={item.stock}
            onReserve={() => reserve.mutate(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="inventory-2" title="Rien dans cette catégorie" text="Aucun produit disponible pour le moment." tone="muted" />
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    list: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
    row: { gap: spacing.sm, marginBottom: spacing.sm },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    reservationCard: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    productName: { fontFamily: fonts.headSemiBold, fontSize: 14, color: colors.text },
    productMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  });
}
