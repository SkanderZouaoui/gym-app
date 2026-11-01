import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { fonts, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useVenue, useVenueLogoMutations } from '../hooks/useVenue';
import { parseMapsLocation } from '../utils/maps';
import { ImageEditor } from './ImageEditor';
import { Banner } from './ui';
import { VenueLogo } from './venue/VenueLogo';
import { VenueMap } from './venue/VenueMap';

/** Logo de la salle : importé (avec rognage) puis converti par l'API ; retirable. */
export function VenueLogoRow({ name }: { name: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: venue } = useVenue();
  const { upload, remove } = useVenueLogoMutations();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const busy = upload.isPending || remove.isPending;

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
    <View style={styles.block}>
      <View style={styles.row}>
        <VenueLogo name={name || venue?.name || 'M'} logoUrl={venue?.logoUrl ?? null} size={64} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.label}>{t('admin.venue_logo')}</Text>
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.btnStrong]} onPress={pick} disabled={busy}>
              {busy ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : <MaterialIcons name="add-photo-alternate" size={18} color={colors.primaryContrast} />}
              <Text style={[styles.btnText, { color: colors.primaryContrast }]}>{venue?.logoUrl ? t('admin.venue_logo_change') : t('admin.venue_logo_add')}</Text>
            </Pressable>
            {venue?.logoUrl ? (
              <Pressable style={[styles.btn, styles.btnSoft]} onPress={() => remove.mutate()} disabled={busy}>
                <MaterialIcons name="delete-outline" size={18} color={colors.dangerInk} />
                <Text style={[styles.btnText, { color: colors.dangerInk }]}>{t('admin.venue_logo_remove')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {error ? <Banner tone="danger" icon="error-outline" text={t('admin.venue_logo_error')} /> : null}

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

/** Position GPS de la salle : position actuelle du téléphone, lien/coordonnées collés depuis Google Maps, aperçu de la carte. */
export function VenueLocationRow({
  latitude,
  longitude,
  address,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onChange: (pos: { latitude: number; longitude: number } | null) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const has = latitude != null && longitude != null;

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
    } catch {
      setMessage(t('admin.venue_gps_denied'));
    } finally {
      setLocating(false);
    }
  };

  const paste = async () => {
    setMessage(null);
    const parsed = parseMapsLocation(await Clipboard.getStringAsync());
    if (parsed) onChange(parsed);
    else setMessage(t('admin.venue_gps_invalid'));
  };

  return (
    <View style={styles.block}>
      <View style={{ gap: 2 }}>
        <Text style={styles.label}>{t('admin.venue_gps')}</Text>
        <Text style={styles.hint}>{has ? `${latitude!.toFixed(5)}, ${longitude!.toFixed(5)}` : t('admin.venue_gps_none')}</Text>
      </View>
      {has ? <VenueMap latitude={latitude!} longitude={longitude!} address={address} width={width - spacing.lg * 2 - 32} height={150} /> : null}
      <View style={styles.buttons}>
        <Pressable style={[styles.btn, styles.btnStrong]} onPress={useCurrent} disabled={locating}>
          {locating ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : <MaterialIcons name="my-location" size={18} color={colors.primaryContrast} />}
          <Text style={[styles.btnText, { color: colors.primaryContrast }]}>{t('admin.venue_gps_current')}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSoft]} onPress={paste}>
          <MaterialIcons name="content-paste" size={18} color={colors.primaryInk} />
          <Text style={[styles.btnText, { color: colors.primaryInk }]}>{t('admin.venue_gps_paste')}</Text>
        </Pressable>
        {has ? (
          <Pressable style={[styles.btn, styles.btnSoft]} onPress={() => onChange(null)}>
            <MaterialIcons name="close" size={18} color={colors.dangerInk} />
            <Text style={[styles.btnText, { color: colors.dangerInk }]}>{t('admin.venue_gps_clear')}</Text>
          </Pressable>
        ) : null}
      </View>
      {message ? <Banner tone="warning" icon="info-outline" text={message} /> : <Text style={styles.hint}>{t('admin.venue_gps_hint')}</Text>}
    </View>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    block: { gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
    btnStrong: { backgroundColor: colors.primary },
    btnSoft: { backgroundColor: colors.surface2 },
    btnText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  });
}
