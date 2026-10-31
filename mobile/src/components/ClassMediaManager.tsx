import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Banner, EmptyState } from './ui';
import { ScreenHeader } from './ScreenHeader';
import { useAllClassTypes } from '../hooks/useAdmin';
import { useAddClassGalleryImages, useRemoveClassGalleryImage } from '../hooks/useClassMedia';
import { useOfflineAwareRefresh } from '../hooks/useOfflineAwareRefresh';

const COLUMNS = 3;
const GAP = 10;
const MAX_PER_PICK = 10;

/** Médias des cours (admin) : choisir un type de cours, voir sa galerie, ajouter ou supprimer des photos. */
export function ClassMediaManager() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const { data: types, refetch, isLoading } = useAllClassTypes();
  const add = useAddClassGalleryImages();
  const remove = useRemoveClassGalleryImage();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'warning'; text: string } | null>(null);

  // Premier type par défaut ; si le type choisi disparaît (désactivé/supprimé), on retombe sur le premier.
  const selected = types?.find((x) => x.id === selectedId) ?? types?.[0] ?? null;
  const tile = Math.floor((width - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const pickAndUpload = async () => {
    if (!selected || add.isPending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('member.permission_refusee'), t('member.lacces_a_vos_photos_est'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PER_PICK,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setMessage(null);
    const { added, failed } = await add.mutateAsync({
      typeId: selected.id,
      images: result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType })),
    });
    if (failed === 0) setMessage({ tone: 'success', text: t('common.class_media_added', { count: added }) });
    else setMessage({ tone: added > 0 ? 'warning' : 'danger', text: t('common.class_media_upload_error', { count: failed }) });
  };

  const confirmRemove = (key: string) => {
    if (!selected) return;
    Alert.alert(t('common.class_media_delete_title'), t('common.class_media_delete_text'), [
      { text: t('common.annuler'), style: 'cancel' },
      {
        text: t('common.class_media_delete_confirm'),
        style: 'destructive',
        onPress: () => {
          setMessage(null);
          remove.mutate({ typeId: selected.id, key }, { onError: () => setMessage({ tone: 'danger', text: t('common.class_media_delete_error') }) });
        },
      },
    ]);
  };

  const urls = selected?.galleryUrls ?? [];
  const keys = selected?.galleryKeys ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ScreenHeader title={t('common.class_media_title')} fallbackHref="/(admin)/(tabs)/more" />
        <Text style={styles.subtitle}>{t('common.class_media_subtitle')}</Text>

        {types && types.length === 0 ? (
          <EmptyState icon="photo-library" title={t('common.class_media_no_types_title')} text={t('common.class_media_no_types')} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(types ?? []).map((type) => {
                const active = type.id === selected?.id;
                return (
                  <Pressable key={type.id} onPress={() => setSelectedId(type.id)} style={[styles.chip, active && styles.chipActive]} accessibilityState={{ selected: active }}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{type.name}</Text>
                    <Text style={[styles.chipCount, active && styles.chipTextActive]}>{type.galleryKeys.length}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {message ? <Banner tone={message.tone} icon={message.tone === 'success' ? 'check-circle' : 'error-outline'} text={message.text} /> : null}

            <View style={styles.grid}>
              <Pressable onPress={pickAndUpload} disabled={!selected || add.isPending} style={[styles.tile, styles.addTile, { width: tile, height: tile }, add.isPending && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={t('common.class_media_add')}>
                <MaterialIcons name={add.isPending ? 'hourglass-top' : 'add-photo-alternate'} size={30} color={colors.primary} />
                <Text style={styles.addText}>{add.isPending ? t('common.class_media_uploading') : t('common.class_media_add')}</Text>
              </Pressable>
              {urls.map((url, i) => (
                <View key={keys[i] ?? url} style={[styles.tile, { width: tile, height: tile }]}>
                  <Image source={{ uri: url }} style={styles.image} />
                  <Pressable onPress={() => confirmRemove(keys[i])} hitSlop={6} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('common.class_media_delete_confirm')} disabled={remove.isPending}>
                    <MaterialIcons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>

            {!isLoading && urls.length === 0 ? <Text style={styles.empty}>{t('common.class_media_empty')}</Text> : null}
            <Text style={styles.hint}>{t('common.class_media_hint')}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    chips: { gap: 8, paddingVertical: 2 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 38, borderRadius: 999,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    chipTextActive: { color: colors.primaryContrast },
    chipCount: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
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
    empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
    hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
  });
}
