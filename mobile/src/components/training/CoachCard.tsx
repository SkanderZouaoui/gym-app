import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../ui';

interface CoachCardProps {
  firstName: string;
  lastName: string;
  specialties: string[];
  rating?: string | null;
  sessionPrice?: string | null;
  onPress: () => void;
}

/** Carte coach de l'annuaire — FitZone App Entraînement.dc.html, G1. */
export function CoachCard({ firstName, lastName, specialties, rating, sessionPrice, onPress }: CoachCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Avatar initials={`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()} size={56} background={colors.accentSoft} color={colors.accentInk} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{firstName}</Text>
        {specialties.length ? (
          <Text style={styles.specialties} numberOfLines={1}>{specialties.join(' · ')}</Text>
        ) : null}
        <View style={styles.metaRow}>
          {rating ? (
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={14} color={colors.accentInk} />
              <Text style={styles.ratingText}>{Number(rating).toFixed(1).replace('.', ',')}</Text>
            </View>
          ) : null}
          {sessionPrice ? <Text style={styles.priceText}>{sessionPrice} DT</Text> : null}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
      borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    name: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    specialties: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    ratingText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accentInk },
    priceText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  });
}
