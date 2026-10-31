import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Banner } from './ui';
import { useAllClassTypes } from '../hooks/useAdmin';
import { useAddClassGalleryImages, useRemoveClassGalleryImage } from '../hooks/useClassMedia';

const COLUMNS = 3;
const GAP = 10;
const MAX_PER_PICK = 10;
/** Doit rester aligné sur MAX_TYPE_GALLERY côté API. */
const MAX_GALLERY = 12;

/**
 * Photos du cours, dans l'écran de création / modification d'un cours (admin). Elles sont rattachées au TYPE de
 * cours sélectionné : tous les cours de ce type les partagent, on ne les importe donc qu'une fois. Import multiple
 * (jusqu'à 10 à la fois) ; les envois et suppressions sont immédiats (le type existe déjà).
 */
export function ClassTypeMediaSection({ typeId }: { typeId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const { data: types } = useAllClassTypes();
  const add = useAddClassGalleryImages();
  const remove = useRemoveClassGalleryImage();
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'warning'; text: string } | null>(null);

  const type = types?.find((x) => x.id === typeId);
  const urls = type?.galleryUrls ?? [];
  const keys = type?.galleryKeys ?? [];
  const remaining = MAX_GALLERY - keys.length;
  const tile = Math.floor((width - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const pickAndUpload = async () => {
    if (!type || add.isPending || remaining <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('member.permission_refusee'), t('member.lacces_a_vos_photos_est'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.min(MAX_PER_PICK, remaining),
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setMessage(null);
    const { added, failed } = await add.mutateAsync({
      typeId: type.id,
      images: result.assets.slice(0, remaining).map((a) => ({ uri: a.uri, mimeType: a.mimeType })),
    });
    if (failed === 0) setMessage({ tone: 'success', text: t('common.class_media_added', { count: added }) });
    else setMessage({ tone: added > 0 ? 'warning' : 'danger', text: t('common.class_media_upload_error', { count: failed }) });
  };

  const confirmRemove = (key: string) => {
    Alert.alert(t('common.class_media_delete_title'), t('common.class_media_delete_text'), [
      { text: t('common.annuler'), style: 'cancel' },
      {
        text: t('common.class_media_delete_confirm'),
        style: 'destructive',
        onPress: () => {
          setMessage(null);
          remove.mutate({ typeId, key }, { onError: () => setMessage({ tone: 'danger', text: t('common.class_media_delete_error') }) });
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('common.class_media_title')}</Text>
        <Text style={styles.count}>{keys.length}/{MAX_GALLERY}</Text>
      </View>
      <Text style={styles.hint}>{t('common.class_media_shared_hint', { name: type?.name ?? '' })}</Text>

      {message ? <Banner tone={message.tone} icon={message.tone === 'success' ? 'check-circle' : 'error-outline'} text={message.text} /> : null}

      <View style={styles.grid}>
        {remaining > 0 ? (
          <Pressable
            onPress={pickAndUpload}
            disabled={!type || add.isPending}
            style={[styles.tile, styles.addTile, { width: tile, height: tile }, add.isPending && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.class_media_add')}
          >
            <MaterialIcons name={add.isPending ? 'hourglass-top' : 'add-photo-alternate'} size={30} color={colors.primary} />
            <Text style={styles.addText}>{add.isPending ? t('common.class_media_uploading') : t('common.class_media_add')}</Text>
          </Pressable>
        ) : null}
        {urls.map((url, i) => (
          <View key={keys[i] ?? url} style={[styles.tile, { width: tile, height: tile }]}>
            <Image source={{ uri: url }} style={styles.image} />
            <Pressable onPress={() => confirmRemove(keys[i])} hitSlop={6} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('common.class_media_delete_confirm')} disabled={remove.isPending}>
              <MaterialIcons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
      </View>

      {urls.length === 0 ? <Text style={styles.empty}>{t('common.class_media_empty')}</Text> : null}
      {remaining <= 0 ? <Text style={styles.empty}>{t('common.class_media_full')}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    count: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
    hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: -4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    tile: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface2 },
    addTile: {
      alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, backgroundColor: colors.primarySoft,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryBorder,
    },
    addText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk, textAlign: 'center' },
    image: { width: '100%', height: '100%' },
    remove: {
      position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
    },
    empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
  });
}
