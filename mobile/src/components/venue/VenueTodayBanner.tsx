import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useNow } from '../../hooks/useNow';
import { useVenue } from '../../hooks/useVenue';
import { openMinutes, weekdayIndex } from '../../utils/openingHours';
import { WEEKDAYS_LONG_MON, WEEKDAYS_NARROW_MON } from '../../i18n/labels';
import { haptics } from '../../utils/haptics';
import { SectionHeader } from '../ui';
import { VenueLogo } from './VenueLogo';
import { VenueStatusBadge } from './VenueStatusBadge';

/**
 * Carte « La salle » de l'accueil : logo, nom et état du moment, horaires du jour en grand avec la semaine d'un coup d'œil
 * (jours ouverts, jour courant cerclé). Un appui ouvre la fiche complète (coordonnées, itinéraire).
 */
export function VenueTodayBanner({ href }: { href: Href }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const nowMs = useNow();
  const { data: venue } = useVenue();
  // Jour affiché : celui que l'on touche, sinon aujourd'hui.
  const [picked, setPicked] = useState<number | null>(null);

  if (!venue) return null;
  const todayIndex = weekdayIndex(new Date(nowMs));
  const shown = picked ?? todayIndex;
  const day = venue.hours[shown];
  const hours = day?.open && openMinutes(day) > 0 ? `${day.from}–${day.to}` : null;
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader icon="storefront" title={t('venue.title')} actionLabel={t('venue.see_details')} onAction={() => router.push(href)} />
      <View style={[styles.card, cardShadow]}>
        <Pressable onPress={() => router.push(href)} style={styles.head} accessibilityRole="button" accessibilityLabel={t('venue.see_details')}>
          <VenueLogo name={venue.name} logoUrl={venue.logoUrl} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.name} numberOfLines={2}>{venue.name}</Text>
            <VenueStatusBadge hours={venue.hours} compact />
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        </Pressable>

        <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hoursBox}>
          <View style={styles.decor} pointerEvents="none" />
          <View style={styles.hoursTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.hoursKicker} numberOfLines={1}>{(shown === todayIndex ? t('venue.today') : WEEKDAYS_LONG_MON[shown]).toUpperCase()}</Text>
              <Text style={styles.hoursValue}>{hours ?? t('venue.closed')}</Text>
            </View>
          </View>
          <View style={styles.week}>
            {venue.hours.map((h, i) => {
              const selected = i === shown;
              const isToday = i === todayIndex;
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    setPicked(i === todayIndex ? null : i);
                    void haptics.selection();
                  }}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={WEEKDAYS_LONG_MON[i]}
                  style={({ pressed }) => [styles.dayCol, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.day, h.open ? styles.dayOpen : styles.dayClosed, selected && styles.daySelected]}>
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{WEEKDAYS_NARROW_MON[i]}</Text>
                  </View>
                  <View style={[styles.todayDot, !isToday && { opacity: 0 }]} />
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    name: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    hoursBox: { gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, overflow: 'hidden' },
    decor: { position: 'absolute', right: -30, top: -40, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.10)' },
    hoursKicker: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, color: 'rgba(255,255,255,0.75)' },
    hoursValue: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: '#FFFFFF' },
    hoursTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    week: { flexDirection: 'row', justifyContent: 'space-between' },
    dayCol: { alignItems: 'center', gap: 3 },
    day: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    dayOpen: { backgroundColor: 'rgba(255,255,255,0.22)' },
    dayClosed: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    daySelected: { backgroundColor: '#FFFFFF', borderWidth: 0 },
    dayText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#FFFFFF' },
    dayTextSelected: { fontFamily: fonts.bodyBold, color: colors.primaryInk },
    todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  });
}
