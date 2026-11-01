import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useNow } from '../../hooks/useNow';
import { useVenue } from '../../hooks/useVenue';
import { haptics } from '../../utils/haptics';
import { hoursLabel, weekdayIndex } from '../../utils/openingHours';
import { directionsUrl } from '../../utils/maps';
import { WEEKDAYS_NARROW_MON } from '../../i18n/labels';
import { Toast } from '../ui';
import { VenueLogo } from './VenueLogo';
import { VenueStatusBadge } from './VenueStatusBadge';

/**
 * Carte « La salle » de l'accueil : logo, nom et état du moment, horaires du jour en grand avec la semaine d'un coup d'œil
 * (jours ouverts, jour courant cerclé), et les gestes utiles au comptoir — appeler, ouvrir l'itinéraire, copier le numéro
 * pour un adhérent. Un appui sur l'en-tête ouvre la fiche complète.
 */
export function VenueTodayBanner({ href }: { href: Href }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const nowMs = useNow();
  const { data: venue } = useVenue();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  if (!venue) return null;
  const now = new Date(nowMs);
  const today = hoursLabel(venue.hours, now);
  const todayIndex = weekdayIndex(now);
  const contact = venue.contact;
  const hasPosition = contact?.latitude != null && contact?.longitude != null;
  const directions = contact && hasPosition ? directionsUrl(contact) : null;
  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    void haptics.success();
    setToast(t('venue.copied'));
  };

  return (
    <View style={{ gap: 10 }}>
      {toast ? <Toast icon="content-copy" text={toast} /> : null}
      <Text style={styles.sectionTitle}>{t('venue.title')}</Text>
      <View style={[styles.card, cardShadow]}>
        <Pressable onPress={() => router.push(href)} style={styles.head} accessibilityRole="button" accessibilityLabel={t('venue.see_details')}>
          <VenueLogo name={venue.name} logoUrl={venue.logoUrl} size={50} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.name} numberOfLines={2}>{venue.name}</Text>
            <VenueStatusBadge hours={venue.hours} compact />
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        </Pressable>

        <View style={styles.hoursBox}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.hoursKicker}>{t('venue.today').toUpperCase()}</Text>
            <Text style={[styles.hoursValue, !today && { color: colors.muted }]} numberOfLines={1}>{today ?? t('venue.closed')}</Text>
          </View>
          <View style={styles.week}>
            {venue.hours.map((h, i) => {
              const isToday = i === todayIndex;
              return (
                <View key={i} style={[styles.day, h.open ? styles.dayOpen : styles.dayClosed, isToday && styles.dayToday]}>
                  <Text style={[styles.dayText, h.open ? { color: colors.primaryInk } : { color: colors.muted }, isToday && { fontFamily: fonts.bodyBold }]}>{WEEKDAYS_NARROW_MON[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {contact && (contact.phone || directions) ? (
          <View style={styles.actions}>
            {contact.phone ? <Action icon="call" label={t('venue.call')} strong onPress={() => void Linking.openURL(`tel:${contact.phone.replace(/\s+/g, '')}`)} /> : null}
            {directions ? <Action icon="directions" label={t('venue.directions')} onPress={() => void Linking.openURL(directions)} /> : null}
            {contact.phone ? <Action icon="content-copy" label={t('venue.copy_phone')} onPress={() => void copy(contact.phone)} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  function Action({ icon, label, onPress, strong }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; strong?: boolean }) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.action, strong ? styles.actionStrong : styles.actionSoft, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button">
        <MaterialIcons name={icon} size={20} color={strong ? colors.primaryContrast : colors.primaryInk} />
        <Text style={[styles.actionText, { color: strong ? colors.primaryContrast : colors.primaryInk }]} numberOfLines={2}>{label}</Text>
      </Pressable>
    );
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    sectionTitle: { fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.4, color: colors.text },
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 14 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    name: { fontFamily: fonts.head, fontSize: 18, letterSpacing: -0.4, color: colors.text },
    hoursBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.surface2 },
    hoursKicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.muted },
    hoursValue: { fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.6, color: colors.text },
    week: { flexDirection: 'row', gap: 4 },
    day: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
    dayOpen: { backgroundColor: colors.primarySoft },
    dayClosed: { backgroundColor: 'transparent' },
    dayToday: { borderColor: colors.primary },
    dayText: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
    actions: { flexDirection: 'row', gap: 8 },
    action: { flex: 1, minHeight: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 8 },
    actionStrong: { backgroundColor: colors.primary },
    actionSoft: { backgroundColor: colors.primarySoft },
    actionText: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: 'center' },
  });
}
