import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useNow } from '../../hooks/useNow';
import { useVenue, type VenueContact } from '../../hooks/useVenue';
import { useOfflineAwareRefresh } from '../../hooks/useOfflineAwareRefresh';
import { haptics } from '../../utils/haptics';
import { directionsUrl } from '../../utils/maps';
import { weekdayIndex } from '../../utils/openingHours';
import { WEEKDAYS_LONG_MON } from '../../i18n/labels';
import { Banner, SkeletonBlock, Toast } from '../ui';
import { SessionGallery } from '../gallery/SessionGallery';
import { photosOf } from '../gallery/photos';
import { VenueLogo } from './VenueLogo';
import { VenueMap } from './VenueMap';
import { VenueStatusBadge } from './VenueStatusBadge';

/**
 * Fiche de la salle, partagée par adhérent, accueil, coach et admin : logo, nom et état du moment, photos, carte avec
 * itinéraire, coordonnées (appeler, écrire, copier l'adresse) et horaires de la semaine. Le serveur n'envoie les
 * coordonnées à un adhérent que si l'admin les a rendues visibles.
 */
export function VenueScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const nowMs = useNow();
  const { data: venue, isLoading, isError, refetch } = useVenue();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [toast, setToast] = useState<string | null>(null);
  const today = weekdayIndex(new Date(nowMs));

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const open = (url: string | null) => url && void Linking.openURL(url);
  const copyAddress = async (address: string) => {
    await Clipboard.setStringAsync(address);
    void haptics.success();
    setToast(t('venue.address_copied'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {toast ? <Toast icon="content-copy" text={toast} /> : null}
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : undefined)} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.retour')}</Text>
        </Pressable>

        {isLoading ? (
          <View style={{ gap: 14 }}>
            <SkeletonBlock height={72} radius={radii.xl} />
            <SkeletonBlock height={200} radius={radii.xl} />
            <SkeletonBlock height={180} radius={radii.xl} />
          </View>
        ) : isError || !venue ? (
          <Banner tone="warning" icon="sync-problem" text={t('venue.unavailable')} />
        ) : (
          <>
            <View style={styles.hero}>
              <VenueLogo name={venue.name} logoUrl={venue.logoUrl} size={68} />
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Text style={styles.name} numberOfLines={2}>{venue.name}</Text>
                <VenueStatusBadge hours={venue.hours} />
              </View>
            </View>

            <SessionGallery sections={[{ id: 'venue', label: venue.name, photos: photosOf(venue.gallery) }]} />

            <ContactBlock
              contact={venue.contact}
              mapWidth={width - spacing.lg * 2}
              onCall={(p) => open(`tel:${p.replace(/\s+/g, '')}`)}
              onMail={(e) => open(`mailto:${e}`)}
              onCopy={copyAddress}
              onDirections={(c) => open(directionsUrl(c))}
            />

            <Text style={styles.section}>{t('venue.hours')}</Text>
            <View style={[styles.card, cardShadow]}>
              {venue.hours.map((h, i) => (
                <View key={i} style={[styles.hourRow, i === today && styles.hourToday, i > 0 && styles.hourBorder]}>
                  <Text style={[styles.day, i === today && styles.dayToday]}>{WEEKDAYS_LONG_MON[i]}</Text>
                  <Text style={[styles.hours, !h.open && { color: colors.muted }, i === today && styles.dayToday]}>
                    {h.open ? `${h.from} – ${h.to}` : t('venue.closed')}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactBlock({
  contact,
  mapWidth,
  onCall,
  onMail,
  onCopy,
  onDirections,
}: {
  contact: VenueContact | null;
  mapWidth: number;
  onCall: (phone: string) => void;
  onMail: (email: string) => void;
  onCopy: (address: string) => void;
  onDirections: (c: { latitude: number | null; longitude: number | null; address: string }) => void;
}) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!contact) return null;
  const hasPosition = contact.latitude != null && contact.longitude != null;
  const hasAnything = hasPosition || contact.address || contact.phone || contact.email;
  if (!hasAnything) return null;

  return (
    <>
      <Text style={styles.section}>{t('venue.contact')}</Text>
      {hasPosition ? <VenueMap latitude={contact.latitude!} longitude={contact.longitude!} address={contact.address} width={mapWidth} /> : null}
      <View style={[styles.card, cardShadow]}>
        {contact.address ? (
          <ContactRow
            icon="location-on"
            label={contact.address}
            actions={[
              { icon: 'directions', label: t('venue.directions'), onPress: () => onDirections(contact) },
              { icon: 'content-copy', label: t('venue.copy_address'), onPress: () => onCopy(contact.address) },
            ]}
          />
        ) : null}
        {contact.phone ? (
          <ContactRow icon="call" label={contact.phone} border={!!contact.address} actions={[{ icon: 'call', label: t('venue.call'), onPress: () => onCall(contact.phone) }]} />
        ) : null}
        {contact.email ? (
          <ContactRow icon="mail" label={contact.email} border={!!(contact.address || contact.phone)} actions={[{ icon: 'send', label: t('venue.email'), onPress: () => onMail(contact.email) }]} />
        ) : null}
      </View>
    </>
  );
}

function ContactRow({
  icon,
  label,
  border,
  actions,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  border?: boolean;
  actions: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }[];
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.contactRow, border && styles.hourBorder]}>
      <View style={styles.contactIcon}>
        <MaterialIcons name={icon} size={20} color={colors.primaryInk} />
      </View>
      <Text style={styles.contactText} numberOfLines={2} selectable>{label}</Text>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} style={styles.action} hitSlop={6} accessibilityRole="button" accessibilityLabel={a.label}>
          <MaterialIcons name={a.icon} size={20} color={colors.primaryContrast} />
        </Pressable>
      ))}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 14, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    name: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.6, color: colors.text },
    section: { fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.4, color: colors.text, marginTop: 6 },
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    contactIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    contactText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14.5, color: colors.text },
    action: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 48 },
    hourBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    hourToday: { backgroundColor: colors.primarySoft },
    day: { fontFamily: fonts.bodySemiBold, fontSize: 14.5, color: colors.text },
    hours: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
    dayToday: { color: colors.primaryInk, fontFamily: fonts.bodyBold },
  });
}
