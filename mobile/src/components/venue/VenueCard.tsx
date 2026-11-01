import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useVenue } from '../../hooks/useVenue';
import { VenueLogo } from './VenueLogo';
import { VenueStatusBadge } from './VenueStatusBadge';

/** Carte « La salle » : logo, nom et état ouvert/fermé du moment ; un appui ouvre la fiche complète. */
export function VenueCard({ href }: { href: Href }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const { data: venue } = useVenue();
  if (!venue) return null;
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.98 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`${t('venue.title')} · ${venue.name}`}
    >
      <VenueLogo name={venue.name} logoUrl={venue.logoUrl} size={54} />
      <View style={styles.body}>
        <Text style={[styles.kicker, { color: colors.muted }]}>{t('venue.title').toUpperCase()}</Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{venue.name}</Text>
        <VenueStatusBadge hours={venue.hours} compact />
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.muted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radii.xl, borderWidth: 1 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8 },
  name: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4 },
  chevron: { transform: [{ scaleX: 1 }] },
});
