import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useRequestAvatarUploadUrl, useUpdateProfile } from './useProfile';
import { normalizeImageType, readUploadBlob } from '../utils/upload';

/**
 * Changement de la photo de profil (adhérent, coach, accueil, admin) : choix dans la photothèque,
 * recadrage carré, envoi direct au stockage (URL présignée) puis enregistrement de la clé sur le profil.
 * `onError` reçoit un message traduit ; `onSuccess` est appelé une fois la photo enregistrée.
 */
export function useProfilePhoto(opts: { onError?: (message: string) => void; onSuccess?: () => void } = {}) {
  const { t } = useTranslation();
  const requestUploadUrl = useRequestAvatarUploadUrl();
  const updateProfile = useUpdateProfile();
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      setLocalPhotoUri(null);
      opts.onError?.(t('member.lenvoi_de_la_photo_a'));
    } finally {
      setUploading(false);
    }
  };

  return { pickPhoto, uploading, localPhotoUri };
}
