import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface ProductCardProps {
  name: string;
  price: string;
  stock: number;
  onReserve: () => void;
}

/** Carte produit de la grille 2 colonnes Boutique — FitZone App Compte.dc.html, K1. */
export function ProductCard({ name, price, stock, onReserve }: ProductCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 3;

  return (
    <View style={styles.card}>
      <View style={styles.imageBox}>
        <MaterialIcons name="inventory-2" size={34} color={colors.border} />
        {outOfStock ? (
          <View style={[styles.tag, styles.tagDanger]}>
            <Text style={styles.tagText}>Rupture</Text>
          </View>
        ) : lowStock ? (
          <View style={[styles.tag, styles.tagWarning]}>
            <Text style={[styles.tagText, { color: colors.warningInk }]}>Plus que {stock}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      <Text style={styles.price}>{price} DT</Text>
      <Pressable onPress={onReserve} disabled={outOfStock} style={[styles.button, outOfStock && styles.buttonDisabled]}>
        <Text style={[styles.buttonText, outOfStock && styles.buttonTextDisabled]}>
          {outOfStock ? "M'alerter" : 'Réserver'}
        </Text>
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.sm, gap: 6,
    },
    imageBox: {
      height: 90, borderRadius: radii.sm, backgroundColor: colors.surface2,
      alignItems: 'center', justifyContent: 'center',
    },
    tag: { position: 'absolute', top: 6, left: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    tagDanger: { backgroundColor: colors.dangerSoft },
    tagWarning: { backgroundColor: colors.warningSoft },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.dangerInk },
    name: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, minHeight: 32 },
    price: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    button: { height: 34, borderRadius: radii.xs, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    buttonDisabled: { backgroundColor: colors.surface2 },
    buttonText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    buttonTextDisabled: { color: colors.muted },
  });
}
