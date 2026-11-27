import { PHONE_PLACEHOLDER } from '../../src/constants/phone';
import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { GymRefreshControl } from '../../src/components/ui/GymRefreshControl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useMe } from '../../src/hooks/useMe';
import { useGender, type Gender } from '../../src/hooks/useGender';
import {
  useConfirmEmailChange,
  useRequestEmailChange,
  useUpdateProfile,
} from '../../src/hooks/useProfile';
import { Banner, ScreenTitle, Toast } from '../../src/components/ui';
import { KeyboardAwareScreen } from '../../src/components/ui/KeyboardAwareScreen';
import { ApiError } from '../../src/api/client';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { otpRateLimitMessage } from '../../src/utils/otpErrors';
import { useProfilePhoto } from '../../src/hooks/useProfilePhoto';
import { SectionHeader } from '../../src/components/ui/SectionHeader';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user, refetch } = useMe();
  const updateProfile = useUpdateProfile();
  const requestEmailChange = useRequestEmailChange();
  const confirmEmailChange = useConfirmEmailChange();
  // Les champs (firstName/lastName/phone) sont initialisés une seule fois depuis `user`
  // via useState, sans useEffect de resynchronisation : un refetch met à jour `user` et
  // l'email affiché plus bas, mais n'écrase jamais une saisie déjà en cours dans les champs.
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const currentGender = useGender();
  const [genderChoice, setGenderChoice] = useState<Gender | null>(null);
  const gender = genderChoice ?? currentGender ?? null;
  const [error, setError] = useState<string | null>(null);
  // Consultation d'abord ; « Modifier » ouvre le formulaire.
  const [editing, setEditing] = useState(false);
  // À l'ouverture du formulaire, les champs reprennent les valeurs actuelles du profil (et non celles d'un état initial vide).
  const startEdit = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setGenderChoice(null);
    setError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
    setGenderChoice(null);
    setError(null);
    setEditing(false);
  };
  const { onPressAvatar, uploading, localPhotoUri, controls: photoControls } = useProfilePhoto({ onError: setError, onSuccess: () => setError(null) });

  const [emailStep, setEmailStep] = useState<'idle' | 'form' | 'code'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleSave = () => {
    setError(null);
    updateProfile.mutate(
      { firstName, lastName, phone: phone || undefined, ...(genderChoice ? { gender: genderChoice } : {}) },
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
      <KeyboardAwareScreen
        contentContainerStyle={styles.container}
        refreshControl={<GymRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        footer={
          editing ? (
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Button
                label={t('member.enregistrer')}
                onPress={handleSave}
                loading={updateProfile.isPending}
                disabled={!firstName.trim() || !lastName.trim()}
              />
            </View>
          </View>
          ) : undefined
        }
      >
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.profil')}</Text>
        </Pressable>
        <ScreenTitle title={t('member.informations_personnelles')} subtitle={t('member.votre_identite_et_vos_coordonnees')} />

        <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroDecoA} />
          <View style={styles.heroDecoB} />
          <Pressable onPress={onPressAvatar} style={styles.avatarWrap} disabled={uploading} accessibilityLabel={t('member.changer_la_photo')}>
            {displayedPhoto ? (
              <Image source={{ uri: displayedPhoto }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <MaterialIcons name={uploading ? 'hourglass-top' : 'photo-camera'} size={16} color={colors.hero} />
            </View>
          </Pressable>
          <Text style={styles.heroName}>{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}</Text>
          {user?.email ? <Text style={styles.heroEmail}>{user.email}</Text> : null}
          <Pressable onPress={onPressAvatar} disabled={uploading} style={({ pressed }) => [styles.photoPill, pressed && { opacity: 0.8 }]}>
            <MaterialIcons name="photo-camera" size={15} color="#FFFFFF" />
            <Text style={styles.photoPillText}>{uploading ? t('member.envoi_en_cours') : t('member.changer_la_photo')}</Text>
          </Pressable>
        </LinearGradient>

        <View>
          <SectionHeader
            title={t('common.identite')}
            style={{ marginBottom: 10 }}
            actionLabel={editing ? t('member.profile_edit_cancel') : t('member.profile_edit_action')}
            onAction={editing ? cancelEdit : startEdit}
          />
          {editing ? (
            <View style={styles.identityWrap}>
              <View style={styles.editBanner}>
                <MaterialIcons name="edit" size={16} color={colors.primaryInk} />
                <Text style={styles.editBannerText}>{t('member.profile_editing')}</Text>
              </View>
              <EditCard icon="person" label={t('common.prenom')} value={firstName} onChangeText={setFirstName} autoCapitalize="words" autoComplete="given-name" returnKeyType="next" />
              <EditCard icon="badge" label={t('common.nom')} value={lastName} onChangeText={setLastName} autoCapitalize="words" autoComplete="family-name" returnKeyType="next" />
              <EditCard icon="call" label={t('common.telephone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={PHONE_PLACEHOLDER} />
              <View style={[styles.editCard, cardShadow]}>
                <View style={styles.infoIcon}>
                  <MaterialIcons name={gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'wc'} size={19} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
                  <Text style={styles.infoLabel}>{t('onboarding.gender')}</Text>
                  <View style={styles.genderRow}>
                    {(['male', 'female'] as const).map((g) => {
                      const on = gender === g;
                      return (
                        <Pressable key={g} onPress={() => setGenderChoice(g)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={({ pressed }) => [styles.genderTile, pressed && { opacity: 0.85 }]}>
                          {on ? <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
                          <MaterialIcons name={g === 'male' ? 'male' : 'female'} size={26} color={on ? '#FFFFFF' : colors.muted} />
                          <Text style={[styles.genderText, on && { color: '#FFFFFF' }]}>{t(`onboarding.gender_${g}`)}</Text>
                          {on ? <MaterialIcons name="check-circle" size={18} color="#FFFFFF" style={styles.genderCheck} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          ) : (
            <View style={styles.identityWrap}>
              <View style={styles.nameRow}>
                {[
                  { icon: 'person' as const, label: t('common.prenom'), value: user?.firstName },
                  { icon: 'badge' as const, label: t('common.nom'), value: user?.lastName },
                ].map((r) => (
                  <View key={r.label} style={[styles.nameCard, cardShadow]}>
                    <View style={styles.infoIcon}>
                      <MaterialIcons name={r.icon} size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.infoLabel}>{r.label}</Text>
                    <Text style={[styles.nameValue, !r.value && styles.infoValueEmpty]}>{r.value || t('member.profile_not_set')}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.nameRow}>
                {[
                  { icon: 'call' as const, label: t('common.telephone'), value: user?.phone },
                  { icon: (currentGender === 'male' ? 'male' : currentGender === 'female' ? 'female' : 'wc') as 'male', label: t('onboarding.gender'), value: currentGender ? t(`onboarding.gender_${currentGender}`) : null },
                ].map((r) => (
                  <View key={r.label} style={[styles.nameCard, cardShadow]}>
                    <View style={styles.infoIcon}>
                      <MaterialIcons name={r.icon} size={19} color="#FFFFFF" />
                    </View>
                    <Text style={styles.infoLabel}>{r.label}</Text>
                    <Text style={[styles.nameValue, !r.value && styles.infoValueEmpty]}>{r.value || t('member.profile_not_set')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View>
          <SectionHeader title={t('member.adresse_e_mail')} style={{ marginBottom: 10 }} />
          <View style={[styles.card, cardShadow]}>
            {emailSuccess ? <Banner tone="success" icon="check-circle" text={t('member.e_mail_mis_a_jour')} /> : null}

            {emailStep === 'idle' ? (
              <View style={styles.emailRow}>
                <View style={styles.infoIcon}>
                  <MaterialIcons name="mail" size={19} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoLabel}>{t('member.adresse_e_mail')}</Text>
                  <Text style={styles.emailValue} numberOfLines={1}>{user?.email}</Text>
                </View>
                <Pressable onPress={() => setEmailStep('form')} hitSlop={8} style={({ pressed }) => [styles.emailChangePill, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.emailChangeLink}>{t('common.changer')}</Text>
                </Pressable>
              </View>
            ) : emailStep === 'form' ? (
              <>
                {emailError ? <Banner tone="danger" icon="error" text={emailError} /> : null}
                <Text style={styles.emailHint}>{t('member.un_code_a_usage_unique')}</Text>
                <TextField
                  label={t('member.nouvelle_adresse_e_mail')}
                  icon="mail-outline"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextField label={t('member.mot_de_passe_actuel')} icon="lock-outline" value={emailPassword} onChangeText={setEmailPassword} isPassword />
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
                <TextField label={t('common.code_recu')} icon="pin" value={emailCode} onChangeText={(v) => setEmailCode(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} />
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
      </KeyboardAwareScreen>

      {offlineToastVisible ? (
        <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} />
      ) : null}
      {photoControls}
    </SafeAreaView>
  );
}

/** Carte de saisie : même présentation que la carte de consultation, le champ remplace la valeur. */
function EditCard({ icon, label, ...input }: { icon: keyof typeof MaterialIcons.glyphMap; label: string } & Omit<TextInputProps, 'style'>) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInputInstance>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessible={false} style={[styles.editCard, cardShadow, focused && styles.editCardFocused]}>
      <View style={styles.infoIcon}>
        <MaterialIcons name={icon} size={19} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.infoLabel, focused && { color: colors.deep }]}>{label}</Text>
        <TextInput
          ref={ref}
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          selectionColor={colors.deep}
          cursorColor={colors.deep}
          onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
          style={[styles.editInput, focused && styles.editInputFocused]}
        />
      </View>
    </Pressable>
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
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    hero: { borderRadius: radii.xl, padding: 22, paddingTop: 26, alignItems: 'center', gap: 6, overflow: 'hidden' },
    heroDecoA: { position: 'absolute', right: -50, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.08)' },
    heroDecoB: { position: 'absolute', left: -40, bottom: -60, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)' },
    avatarWrap: { width: 108, height: 108, marginBottom: 6 },
    avatarImage: {
      width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)',
    },
    avatarInitials: { fontFamily: fonts.head, fontSize: 36, letterSpacing: -1, color: '#FFFFFF' },
    avatarEditBadge: {
      position: 'absolute', right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17,
      backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
    },
    heroName: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, textTransform: 'uppercase', color: '#FFFFFF' },
    heroEmail: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(255,255,255,0.75)' },
    photoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)' },
    photoPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
    identityWrap: { gap: 10 },
    nameRow: { flexDirection: 'row', gap: 10 },
    nameCard: { flex: 1, minWidth: 0, gap: 3, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    nameValue: { fontFamily: fonts.headBold, fontSize: 17, lineHeight: 21, letterSpacing: -0.2, color: colors.text },
    editBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
    editBannerText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.primaryInk },
    editCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    editCardFocused: { borderColor: colors.deep, shadowColor: colors.deep, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    editInput: { padding: 0, marginTop: 2, paddingBottom: 6, minHeight: 30, fontFamily: fonts.headBold, fontSize: 17, letterSpacing: -0.2, color: colors.text, borderBottomWidth: 1.5, borderBottomColor: colors.borderStrong },
    editInputFocused: { borderBottomColor: colors.deep },
    nameCardFocused: { borderColor: colors.deep, borderWidth: 1.5, shadowColor: colors.deep, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    infoCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
    infoRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
    infoIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.deep },
    infoLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    infoValue: { fontFamily: fonts.headBold, fontSize: 16, letterSpacing: -0.2, color: colors.text, marginTop: 1 },
    infoValueEmpty: { fontFamily: fonts.body, color: colors.muted },
    genderRow: { flexDirection: 'row', gap: 10 },
    genderTile: { flex: 1, height: 68, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
    genderCheck: { position: 'absolute', top: 6, right: 6 },
    genderText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
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
    emailValue: { fontFamily: fonts.headBold, fontSize: 15, letterSpacing: -0.2, color: colors.text, marginTop: 1 },
    emailChangePill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
    emailChangeLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    emailHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    emailButtonRow: { gap: spacing.sm },
    footer: {
      flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
  });
}
