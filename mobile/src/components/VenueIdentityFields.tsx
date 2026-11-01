import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useResolveLocation, useVenue, useVenueLogoMutations } from '../hooks/useVenue';
import { parseMapsLocation } from '../utils/maps';
import { haptics } from '../utils/haptics';
import { ImageEditor } from './ImageEditor';
import { TextField } from './TextField';
import { Banner } from './ui';
import { VenueLogo } from './venue/VenueLogo';
import { VenueMap } from './venue/VenueMap';

type Position = { latitude: number; longitude: number };
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Identité de la salle : logo (touchez-le pour l'importer ou le changer) et nom, présentés comme une fiche. */
export function VenueIdentityCard({ name, onName }: { name: string; onName: (v: string) => void }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: venue } = useVenue();
  const { upload, remove } = useVenueLogoMutations();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const busy = upload.isPending || remove.isPending;
  const hasLogo = !!venue?.logoUrl;

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('member.permission_refusee'), t('member.lacces_a_vos_photos_est'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setError(false);
      setEditing(result.assets[0].uri);
    }
  };

  return (
    <View style={[styles.card, cardShadow]}>
      <LinearGradient colors={[colors.primarySoft, 'rgba(0,0,0,0)']} style={styles.identityGlow} pointerEvents="none" />
      <Pressable onPress={pick} disabled={busy} style={styles.logoWrap} accessibilityRole="button" accessibilityLabel={hasLogo ? t('admin.venue_logo_change') : t('admin.venue_logo_add')}>
        <VenueLogo name={name || venue?.name || 'M'} logoUrl={venue?.logoUrl ?? null} size={92} />
        <View style={[styles.camera, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
          {busy ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : <MaterialIcons name={hasLogo ? 'edit' : 'add-a-photo'} size={16} color={colors.primaryContrast} />}
        </View>
      </Pressable>
      <Text style={styles.logoHint}>{hasLogo ? t('admin.venue_logo_change') : t('admin.venue_logo_add')}</Text>
      {hasLogo ? (
        <Pressable onPress={() => remove.mutate()} disabled={busy} hitSlop={8}>
          <Text style={[styles.logoHint, { color: colors.dangerInk, marginTop: -6 }]}>{t('admin.venue_logo_remove')}</Text>
        </Pressable>
      ) : null}
      {error ? <Banner tone="danger" icon="error-outline" text={t('admin.venue_logo_error')} /> : null}

      <View style={styles.nameBox}>
        <TextField label={t('admin.venue_name')} icon="storefront" value={name} onChangeText={onName} placeholder={venue?.name} autoCapitalize="words" returnKeyType="done" />
      </View>

      <ImageEditor
        visible={editing !== null}
        uri={editing}
        title={t('admin.venue_logo')}
        confirmLabel={t('common.photo_edit_apply')}
        onCancel={() => setEditing(null)}
        onDone={(image) => {
          setEditing(null);
          upload.mutate(image, { onError: () => setError(true) });
        }}
      />
    </View>
  );
}

/**
 * Position de la salle : aperçu de la carte, puis trois actions — position actuelle du téléphone, lien/coordonnées Google
 * Maps (lien court accepté : l'API le résout), effacer. La carte et l'itinéraire apparaissent ensuite côté adhérent.
 */
export function VenueLocationCard({
  address,
  onAddress,
  latitude,
  longitude,
  onChange,
}: {
  address: string;
  onAddress: (v: string) => void;
  latitude: number | null;
  longitude: number | null;
  onChange: (pos: Position | null) => void;
}) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const resolve = useResolveLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const has = latitude != null && longitude != null;
  const mapWidth = width - spacing.lg * 2 - 2;

  const useCurrent = async () => {
    setMessage(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage(t('admin.venue_gps_denied'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onChange({ latitude: round(pos.coords.latitude), longitude: round(pos.coords.longitude) });
      void haptics.success();
      setLinkOpen(false);
    } catch {
      setMessage(t('admin.venue_gps_denied'));
    } finally {
      setLocating(false);
    }
  };

  /** Lecture locale d'abord (lien long, coordonnées) ; sinon l'API suit le lien court et lit la position. */
  const submit = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    setMessage(null);
    const local = parseMapsLocation(value);
    if (local) {
      onChange(local);
      setLink('');
      setLinkOpen(false);
      void haptics.success();
      return;
    }
    resolve.mutate(value, {
      onSuccess: (pos) => {
        onChange({ latitude: round(pos.latitude), longitude: round(pos.longitude) });
        setLink('');
        setLinkOpen(false);
        void haptics.success();
      },
      onError: () => setMessage(t('admin.venue_gps_invalid')),
    });
  };

  const pasteAndSubmit = async () => {
    const text = await Clipboard.getStringAsync();
    setLink(text);
    await submit(text);
  };

  return (
    <View style={[styles.card, cardShadow, { alignItems: 'stretch', paddingHorizontal: 0, paddingBottom: 0, gap: 0 }]}>
      <View style={styles.cardHead}>
        <MaterialIcons name="place" size={20} color={colors.primaryInk} />
        <Text style={styles.cardTitle}>{t('admin.venue_gps')}</Text>
      </View>

      <View style={styles.addressBox}>
        <TextField label={t('admin.adresse')} icon="location-on" value={address} onChangeText={onAddress} autoCapitalize="sentences" returnKeyType="done" />
      </View>

      <View style={styles.mapBox}>
        {has ? (
          <VenueMap latitude={latitude!} longitude={longitude!} address={address} width={mapWidth - 28} height={170} />
        ) : (
          <View style={[styles.mapEmpty, { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft }]}>
            <MaterialIcons name="map" size={34} color={colors.primaryInk} />
            <Text style={styles.mapEmptyTitle}>{t('admin.venue_gps_none')}</Text>
            <Text style={styles.mapEmptyHint}>{t('admin.venue_gps_hint')}</Text>
          </View>
        )}
        {has ? <Text style={styles.coords}>{latitude!.toFixed(5)}, {longitude!.toFixed(5)}</Text> : null}
      </View>

      <View style={styles.tiles}>
        <ActionTile icon="my-location" label={t('admin.venue_gps_current')} busy={locating} onPress={useCurrent} />
        <ActionTile icon="link" label={t('admin.venue_gps_link')} active={linkOpen} onPress={() => setLinkOpen((o) => !o)} />
        {has ? <ActionTile icon="delete-outline" label={t('admin.venue_gps_clear')} danger onPress={() => onChange(null)} /> : null}
      </View>

      {linkOpen ? (
        <View style={styles.linkBox}>
          <View style={styles.linkRow}>
            <TextInput
              value={link}
              onChangeText={setLink}
              onSubmitEditing={() => void submit(link)}
              placeholder={t('admin.venue_gps_link_placeholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              style={styles.linkInput}
            />
            <Pressable onPress={pasteAndSubmit} style={styles.linkBtn} accessibilityLabel={t('admin.venue_gps_paste')} hitSlop={6}>
              <MaterialIcons name="content-paste" size={20} color={colors.primaryInk} />
            </Pressable>
            <Pressable onPress={() => void submit(link)} disabled={!link.trim() || resolve.isPending} style={[styles.linkBtn, styles.linkBtnStrong, (!link.trim() || resolve.isPending) && { opacity: 0.5 }]} accessibilityLabel={t('admin.venue_gps_apply')} hitSlop={6}>
              {resolve.isPending ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : <MaterialIcons name="check" size={20} color={colors.primaryContrast} />}
            </Pressable>
          </View>
          <Text style={styles.linkHint}>{t('admin.venue_gps_link_hint')}</Text>
        </View>
      ) : null}

      {message ? (
        <View style={styles.message}>
          <Banner tone="warning" icon="info-outline" text={message} />
        </View>
      ) : null}
      <View style={{ height: 14 }} />
    </View>
  );

  function ActionTile({ icon, label, onPress, busy, active, danger }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; busy?: boolean; active?: boolean; danger?: boolean }) {
    return (
      <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [styles.tile, active && styles.tileActive, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button">
        {busy ? <ActivityIndicator size="small" color={colors.primaryInk} /> : <MaterialIcons name={icon} size={22} color={danger ? colors.dangerInk : colors.primaryInk} />}
        <Text style={[styles.tileText, danger && { color: colors.dangerInk }]} numberOfLines={2}>{label}</Text>
      </Pressable>
    );
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12, alignItems: 'center', overflow: 'hidden' },
    identityGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
    logoWrap: { marginTop: 4 },
    camera: { position: 'absolute', right: -4, bottom: -4, width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    logoHint: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryInk },
    nameBox: { alignSelf: 'stretch', marginTop: 4 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 16 },
    cardTitle: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    addressBox: { paddingHorizontal: 14, paddingTop: 12 },
    mapBox: { paddingHorizontal: 14, paddingTop: 12, gap: 6, alignItems: 'center' },
    mapEmpty: { alignSelf: 'stretch', height: 150, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 20 },
    mapEmptyTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    mapEmptyHint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.primaryInk, textAlign: 'center', opacity: 0.85 },
    coords: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },
    tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12 },
    tile: { flex: 1, minHeight: 62, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 8 },
    tileActive: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
    tileText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk, textAlign: 'center' },
    linkBox: { paddingHorizontal: 14, paddingTop: 10, gap: 6 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    linkInput: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text },
    linkBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    linkBtnStrong: { backgroundColor: colors.primary },
    linkHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    message: { paddingHorizontal: 14, paddingTop: 10 },
  });
}
