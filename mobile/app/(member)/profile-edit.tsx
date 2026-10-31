import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMe } from '../../src/hooks/useMe';
import {
  useConfirmEmailChange,
  useRequestAvatarUploadUrl,
  useRequestEmailChange,
  useUpdateProfile,
} from '../../src/hooks/useProfile';
import { Banner, ScreenTitle, Toast } from '../../src/components/ui';
import { ApiError } from '../../src/api/client';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { otpRateLimitMessage } from '../../src/utils/otpErrors';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, refetch } = useMe();
  const updateProfile = useUpdateProfile();
  const requestUploadUrl = useRequestAvatarUploadUrl();
  const requestEmailChange = useRequestEmailChange();
  const confirmEmailChange = useConfirmEmailChange();
  // Les champs (firstName/lastName/phone) sont initialisés une seule fois depuis `user`
  // via useState, sans useEffect de resynchronisation : un refetch met à jour `user` et
  // l'email affiché plus bas, mais n'écrase jamais une saisie déjà en cours dans les champs.
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailStep, setEmailStep] = useState<'idle' | 'form' | 'code'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const pickPhoto = async () => {
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
    setError(null);
    try {
      const contentType = asset.mimeType ?? 'image/jpeg';
      const { key, uploadUrl } = await requestUploadUrl.mutateAsync(contentType);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!putResponse.ok) throw new Error('UPLOAD_FAILED');
      await updateProfile.mutateAsync({ photoKey: key });
    } catch {
      setError(t('member.lenvoi_de_la_photo_a'));
      setLocalPhotoUri(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    setError(null);
    updateProfile.mutate(
      { firstName, lastName, phone: phone || undefined },
      {
        onSuccess: () => router.navigate('/(member)/(tabs)/profile'),
        onError: (e) => setError(e instanceof ApiError && e.code === 'PHONE_ALREADY_USED' ? t('common.ce_numero_de_telephone_est') : t('member.impossible_denregistrer_vos_informations_reessayez')),
      },
    );
  };

  const handleRequestEmailCode = () => {
    setEmailError(null);
    requestEmailChange.mutate(
      { newEmail: newEmail.trim(), password: emailPassword },
      {
        onSuccess: () => setEmailStep('code'),
        onError: (e) => setEmailError(otpRateLimitMessage(e) ?? (e instanceof ApiError ? traduireErreurEmail(e.code) : t('member.une_erreur_est_survenue'))),
      },
    );
  };

  const handleConfirmEmailCode = () => {
    setEmailError(null);
    confirmEmailChange.mutate(emailCode.trim(), {
      onSuccess: () => {
        setEmailSuccess(true);
        setEmailStep('idle');
        setNewEmail('');
        setEmailPassword('');
        setEmailCode('');
      },
      onError: (e) => setEmailError(e instanceof ApiError ? traduireErreurEmail(e.code) : i18n.t('common.wrong_code')),
    });
  };

  const displayedPhoto = localPhotoUri ?? user?.photoUrl ?? null;
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/profile'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.profil')}</Text>
        </Pressable>
        <ScreenTitle title={t('member.informations_personnelles')} subtitle={t('member.votre_identite_et_vos_coordonnees')} />

        <View style={styles.avatarSection}>
          <Pressable onPress={pickPhoto} style={styles.avatarWrap} disabled={uploading}>
            {displayedPhoto ? (
              <Image source={{ uri: displayedPhoto }} style={styles.avatarImage} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarImage}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </LinearGradient>
            )}
            <View style={styles.avatarEditBadge}>
              <MaterialIcons name={uploading ? 'hourglass-top' : 'photo-camera'} size={16} color={colors.primaryContrast} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>{uploading ? t('member.envoi_en_cours') : t('member.changer_la_photo')}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>{t('common.identite')}</Text>
          <View style={[styles.card, cardShadow]}>
            <TextField label={t('common.prenom')} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            <TextField label={t('common.nom')} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            <TextField
              label={t('common.telephone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder={t('common.optionnel')}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>{t('member.adresse_e_mail')}</Text>
          <View style={[styles.card, cardShadow]}>
            {emailSuccess ? <Banner tone="success" icon="check-circle" text={t('member.e_mail_mis_a_jour')} /> : null}

            {emailStep === 'idle' ? (
              <View style={styles.emailRow}>
                <View style={styles.emailIcon}>
                  <MaterialIcons name="mail-outline" size={22} color={colors.primaryInk} />
                </View>
                <Text style={styles.emailValue} numberOfLines={1}>{user?.email}</Text>
                <Pressable onPress={() => setEmailStep('form')} hitSlop={8}>
                  <Text style={styles.emailChangeLink}>{t('common.changer')}</Text>
                </Pressable>
              </View>
            ) : emailStep === 'form' ? (
              <>
                {emailError ? <Banner tone="danger" icon="error" text={emailError} /> : null}
                <Text style={styles.emailHint}>{t('member.un_code_a_usage_unique')}</Text>
                <TextField
                  label={t('member.nouvelle_adresse_e_mail')}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextField label={t('member.mot_de_passe_actuel')} value={emailPassword} onChangeText={setEmailPassword} isPassword />
                <View style={styles.emailButtonRow}>
                  <Button
                    label={t('common.envoyer_le_code')}
                    onPress={handleRequestEmailCode}
                    loading={requestEmailChange.isPending}
                    disabled={!newEmail.trim() || !emailPassword}
                  />
                  <Button label={t('common.annuler')} onPress={() => setEmailStep('idle')} variant="ghost" />
                </View>
              </>
            ) : (
              <>
                {emailError ? <Banner tone="danger" icon="error" text={emailError} /> : null}
                <Text style={styles.emailHint}>{t('member.entrez_le_code_recu_a', { v1: newEmail.trim() })}</Text>
                <TextField label={t('common.code_recu')} value={emailCode} onChangeText={setEmailCode} keyboardType="number-pad" maxLength={6} />
                <View style={styles.emailButtonRow}>
                  <Button
                    label={t('member.confirmer')}
                    onPress={handleConfirmEmailCode}
                    loading={confirmEmailChange.isPending}
                    disabled={emailCode.trim().length !== 6}
                  />
                  <Button label={t('common.annuler')} onPress={() => setEmailStep('idle')} variant="ghost" />
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('member.enregistrer')}
          onPress={handleSave}
          loading={updateProfile.isPending}
          disabled={!firstName.trim() || !lastName.trim()}
        />
      </View>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
    </SafeAreaView>
  );
}

function traduireErreurEmail(code: string): string {
  switch (code) {
    case 'INVALID_PASSWORD':
      return i18n.t('member.mot_de_passe_incorrect');
    case 'EMAIL_ALREADY_USED':
      return i18n.t('member.cette_adresse_e_mail_est');
    case 'OTP_INVALID':
      return i18n.t('common.wrong_code');
    case 'OTP_EXPIRED':
      return i18n.t('common.ce_code_a_expire_demandez');
    case 'OTP_TOO_MANY_ATTEMPTS':
      return i18n.t('common.otp_too_many_attempts');
    default:
      return i18n.t('member.une_erreur_est_survenue');
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    avatarSection: { alignItems: 'center', gap: 8 },
    avatarWrap: { width: 104, height: 104 },
    avatarImage: {
      width: 104, height: 104, borderRadius: 52, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarInitials: { fontFamily: fonts.head, fontSize: 34, letterSpacing: -1, color: '#FFFFFF' },
    avatarEditBadge: {
      position: 'absolute', right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: colors.bg,
    },
    avatarHint: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    error: { fontFamily: fonts.body, fontSize: 13, color: colors.dangerInk, textAlign: 'center' },
    sectionTitle: {
      fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8,
      marginLeft: 6, marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: spacing.md,
    },
    emailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    emailIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    emailValue: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    emailChangeLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    emailHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    emailButtonRow: { gap: spacing.sm },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
  });
}
