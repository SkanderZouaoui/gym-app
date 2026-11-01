import { Pressable, StyleSheet, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useVenue } from '../../hooks/useVenue';
import { hoursLabel } from '../../utils/openingHours';

/** Repère sous le sélecteur de jour du planning : « Salle ouverte 07:00–22:00 » pour le jour affiché. */
export function VenueHoursStrip({ date, href }: { date: Date; href: Href }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: venue } = useVenue();
  if (!venue) return null;
  const hours = hoursLabel(venue.hours, date);
  return (
    <Pressable onPress={() => router.push(href)} style={[styles.strip, { backgroundColor: hours ? colors.successSoft : colors.surface2 }]} accessibilityRole="button">
      <MaterialIcons name={hours ? 'schedule' : 'event-busy'} size={18} color={hours ? colors.successInk : colors.muted} />
      <Text style={[styles.text, { color: hours ? colors.successInk : colors.muted }]} numberOfLines={1}>
        {hours ? t('venue.coach_hours', { hours }) : t('venue.coach_closed')}
      </Text>
      <MaterialIcons name="chevron-right" size={18} color={hours ? colors.successInk : colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 40, borderRadius: 20 },
  text: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
});
