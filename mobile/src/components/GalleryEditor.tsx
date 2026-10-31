import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Banner } from './ui';
import { useGalleryMutations } from '../hooks/useGallery';

const COLUMNS = 3;
const GAP = 10;
const MAX_PER_PICK = 10;
/** Doit rester aligné sur MAX_TYPE_GALLERY côté API. */
const MAX_GALLERY = 12;

interface Props {
  title: string;
  hint: string;
  keys: string[];
  urls: string[];
  mutations: ReturnType<typeof useGalleryMutations>;
}

/**
 * Galerie photos éditable (type de cours, salle) : import multiple (jusqu'à 10 à la fois, 12 au total), suppression
 * et réordonnancement par flèches ; la première photo sert de couverture.
 */
export function GalleryEditor({ title, hint, keys, urls, mutations }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { add, remove, reorder } = mutations;
  const [width, setWidth] = useState(0);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'warning'; text: string } | null>(null);

  const remaining = MAX_GALLERY - keys.length;
  const tile = width > 0 ? Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS) : 0;

  const pickAndUpload = async () => {
    if (add.isPending || remaining <= 0) return;
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
    const { added, failed } = await add.mutateAsync(result.assets.slice(0, remaining).map((a) => ({ uri: a.uri, mimeType: a.mimeType })));
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
          remove.mutate(key, { onError: () => setMessage({ tone: 'danger', text: t('common.class_media_delete_error') }) });
        },
      },
    ]);
  };

  /** Échange la photo `index` avec sa voisine (−1 = vers le début, +1 = vers la fin). */
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= keys.length) return;
    const next = [...keys];
    [next[index], next[target]] = [next[target], next[index]];
    setMessage(null);
    reorder.mutate(next, { onError: () => setMessage({ tone: 'danger', text: t('common.class_media_reorder_error') }) });
  };

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{keys.length}/{MAX_GALLERY}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>

      {message ? <Banner tone={message.tone} icon={message.tone === 'success' ? 'check-circle' : 'error-outline'} text={message.text} /> : null}

      {tile > 0 ? (
        <View style={styles.grid}>
          {remaining > 0 ? (
            <Pressable
              onPress={pickAndUpload}
              disabled={add.isPending}
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

              {i === 0 ? (
                <View style={styles.coverBadge}>
                  <MaterialIcons name="star" size={11} color="#FFFFFF" />
                  <Text style={styles.coverText}>{t('common.class_media_cover')}</Text>
                </View>
              ) : null}

              <Pressable onPress={() => confirmRemove(keys[i])} hitSlop={6} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('common.class_media_delete_confirm')} disabled={remove.isPending}>
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
              </Pressable>

              {keys.length > 1 ? (
                <View style={styles.moveBar}>
                  <Pressable onPress={() => move(i, -1)} disabled={i === 0 || reorder.isPending} hitSlop={4} style={[styles.moveBtn, i === 0 && styles.moveBtnOff]} accessibilityRole="button" accessibilityLabel={t('common.class_media_move_earlier')}>
                    <MaterialIcons name="chevron-left" size={20} color="#FFFFFF" />
                  </Pressable>
                  <Pressable onPress={() => move(i, 1)} disabled={i === keys.length - 1 || reorder.isPending} hitSlop={4} style={[styles.moveBtn, i === keys.length - 1 && styles.moveBtnOff]} accessibilityRole="button" accessibilityLabel={t('common.class_media_move_later')}>
                    <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {urls.length === 0 ? <Text style={styles.empty}>{t('common.class_media_empty')}</Text> : null}
      {urls.length > 1 ? <Text style={styles.empty}>{t('common.class_media_reorder_hint')}</Text> : null}
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
    coverBadge: {
      position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    },
    coverText: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: '#FFFFFF' },
    remove: {
      position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
    },
    moveBar: { position: 'absolute', left: 6, right: 6, bottom: 6, flexDirection: 'row', justifyContent: 'space-between' },
    moveBtn: { width: 30, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    moveBtnOff: { opacity: 0.25 },
    empty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
  });
}
