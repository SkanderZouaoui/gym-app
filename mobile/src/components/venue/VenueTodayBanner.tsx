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
import { hoursLabel } from '../../utils/openingHours';
import { Toast } from '../ui';
import { VenueStatusBadge } from './VenueStatusBadge';

/**
 * Bandeau de l'accueil : horaires du jour et état ouvert/fermé, avec les gestes utiles au comptoir — appeler la salle,
 * copier l'adresse ou le numéro pour un adhérent. Un appui sur le bandeau ouvre la fiche complète.
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
  const today = hoursLabel(venue.hours, new Date(nowMs));
  const contact = venue.contact;
  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    void haptics.success();
    setToast(t('venue.address_copied'));
  };

  return (
    <>
      {toast ? <Toast icon="content-copy" text={toast} /> : null}
      <View style={[styles.card, cardShadow]}>
        <Pressable onPress={() => router.push(href)} style={styles.top} accessibilityRole="button" accessibilityLabel={t('venue.see_details')}>
          <View style={styles.icon}>
            <MaterialIcons name="storefront" size={22} color={colors.primaryInk} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.title} numberOfLines={1}>{today ? t('venue.today_hours', { hours: today }) : t('venue.closed_today')}</Text>
            <VenueStatusBadge hours={venue.hours} compact />
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
        {contact && (contact.phone || contact.address) ? (
          <View style={styles.actions}>
            {contact.phone ? (
              <>
                <Chip icon="call" label={t('venue.call')} onPress={() => void Linking.openURL(`tel:${contact.phone.replace(/\s+/g, '')}`)} />
                <Chip icon="content-copy" label={contact.phone} onPress={() => void copy(contact.phone)} subtle />
              </>
            ) : null}
            {contact.address ? <Chip icon="location-on" label={t('venue.copy_address')} onPress={() => void copy(contact.address)} subtle /> : null}
          </View>
        ) : null}
      </View>
    </>
  );

  function Chip({ icon, label, onPress, subtle }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; subtle?: boolean }) {
    return (
      <Pressable onPress={onPress} style={[styles.chip, subtle ? styles.chipSubtle : styles.chipStrong]} accessibilityRole="button">
        <MaterialIcons name={icon} size={16} color={subtle ? colors.primaryInk : colors.primaryContrast} />
        <Text style={[styles.chipText, { color: subtle ? colors.primaryInk : colors.primaryContrast }]} numberOfLines={1}>{label}</Text>
      </Pressable>
    );
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, maxWidth: '100%' },
    chipStrong: { backgroundColor: colors.primary },
    chipSubtle: { backgroundColor: colors.primarySoft },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, flexShrink: 1 },
  });
}
