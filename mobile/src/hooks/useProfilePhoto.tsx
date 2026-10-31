import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useCropAvatar, useRequestAvatarUploadUrl, useUpdateProfile } from './useProfile';
import { useMe } from './useMe';
import { normalizeImageType, readUploadBlob } from '../utils/upload';
import { BottomSheet } from '../components/ui';
import { AvatarCropper } from '../components/AvatarCropper';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface Options {
  onError?: (message: string) => void;
  onSuccess?: () => void;
}

/**
 * Photo de profil (adhérent, coach, accueil, admin). Un appui sur l'avatar :
 *  - sans photo : ouvre la photothèque (recadrage carré), envoie la photo et l'enregistre ;
 *  - avec photo : propose Recadrer / Changer la photo / Supprimer la photo.
 * Le hook renvoie `controls` (menu + recadreur), à rendre une fois dans l'écran.
 */
export function useProfilePhoto(opts: Options = {}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, refetch: refetchMe } = useMe();
  const requestUploadUrl = useRequestAvatarUploadUrl();
  const updateProfile = useUpdateProfile();
  const cropAvatar = useCropAvatar();

  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [cropUri, setCropUri] = useState<string | null>(null);

  const hasPhoto = !!user?.photoKey;

  const pickPhoto = async () => {
    if (uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('member.permission_refusee'), t('member.lacces_a_vos_photos_est'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setLocalPhotoUri(asset.uri);
    setUploading(true);
    try {
      const contentType = normalizeImageType(asset.mimeType);
      const blob = await readUploadBlob(asset.uri);
      const { key, uploadUrl } = await requestUploadUrl.mutateAsync({ contentType, sizeBytes: blob.size });
      const putResponse = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
      if (!putResponse.ok) throw new Error('UPLOAD_FAILED');
      await updateProfile.mutateAsync({ photoKey: key });
      opts.onSuccess?.();
    } catch {
      opts.onError?.(t('member.lenvoi_de_la_photo_a'));
    } finally {
      setLocalPhotoUri(null);
      setUploading(false);
    }
  };

  const removePhoto = () => {
    Alert.alert(t('common.photo_delete_title'), t('common.photo_delete_text'), [
      { text: t('common.annuler'), style: 'cancel' },
      {
        text: t('common.photo_delete'),
        style: 'destructive',
        onPress: async () => {
          setUploading(true);
          try {
            await updateProfile.mutateAsync({ photoKey: null });
            opts.onSuccess?.();
          } catch {
            opts.onError?.(t('common.photo_delete_error'));
          } finally {
            setUploading(false);
          }
        },
      },
    ]);
  };

  // L'URL signée de la photo expire au bout de 5 min : on la rafraîchit avant d'ouvrir le recadreur.
  const openCropper = async () => {
    const fresh = (await refetchMe()).data?.photoUrl ?? user?.photoUrl ?? null;
    if (fresh) setCropUri(fresh);
    else opts.onError?.(t('common.photo_crop_load_error'));
  };

  const confirmCrop = async (rect: Parameters<typeof cropAvatar.mutateAsync>[0]) => {
    try {
      await cropAvatar.mutateAsync(rect);
      setCropUri(null);
      opts.onSuccess?.();
    } catch {
      opts.onError?.(t('common.photo_crop_error'));
    }
  };

  /** Appui sur l'avatar : choisir directement une photo s'il n'y en a pas, sinon ouvrir le menu d'actions. */
  const onPressAvatar = () => {
    if (uploading) return;
    if (hasPhoto) setMenuVisible(true);
    else void pickPhoto();
  };

  const closeThen = (action: () => void) => () => {
    setMenuVisible(false);
    // Laisse la feuille se fermer avant d'ouvrir le sélecteur / la modale suivante (iOS n'en affiche qu'une à la fois).
    setTimeout(action, 350);
  };

  const row = (icon: keyof typeof MaterialIcons.glyphMap, label: string, onPress: () => void, danger = false) => (
    <Pressable key={label} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <View style={[styles.rowIcon, danger && { backgroundColor: colors.dangerSoft }]}>
        <MaterialIcons name={icon} size={22} color={danger ? colors.dangerInk : colors.primaryInk} />
      </View>
      <Text style={[styles.rowText, danger && { color: colors.dangerInk }]}>{label}</Text>
    </Pressable>
  );

  const controls: ReactNode = (
    <>
      <BottomSheet visible={menuVisible} onClose={() => setMenuVisible(false)}>
        <Text style={styles.sheetTitle}>{t('common.photo_menu_title')}</Text>
        <View style={{ gap: spacing.xs }}>
          {row('crop', t('common.photo_crop'), closeThen(() => void openCropper()))}
          {row('photo-library', t('common.photo_change'), closeThen(() => void pickPhoto()))}
          {row('delete-outline', t('common.photo_delete'), closeThen(removePhoto), true)}
        </View>
      </BottomSheet>
      <AvatarCropper
        visible={cropUri !== null}
        imageUri={cropUri}
        saving={cropAvatar.isPending}
        onCancel={() => setCropUri(null)}
        onConfirm={(rect) => void confirmCrop(rect)}
      />
    </>
  );

  return { onPressAvatar, pickPhoto, uploading: uploading || cropAvatar.isPending, localPhotoUri, controls };
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    sheetTitle: { fontFamily: fonts.head, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 6, borderRadius: radii.lg },
    rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    rowText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
  });
}
