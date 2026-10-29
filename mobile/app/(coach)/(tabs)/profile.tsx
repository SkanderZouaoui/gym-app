import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useMe } from '../../../src/hooks/useMe';
import { useUpdateProfile } from '../../../src/hooks/useProfile';
import { useSessionStore } from '../../../src/store/session';
import { tokenStorage } from '../../../src/api/storage';
import { authApi } from '../../../src/api/endpoints';
import { BottomSheet, Toast } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { rootRouteForRole } from '../../../src/navigation/roleRoutes';
import { useHideTabBarOnScroll } from '../../../src/hooks/useHideTabBarOnScroll';

type IconName = keyof typeof MaterialIcons.glyphMap;

/** Profil Coach v2 : identité, spécialités, coordonnées modifiables, sécurité, données du compte. */
export default function CoachProfileScreen() {
  const tabBarScroll = useHideTabBarOnScroll();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: user } = useMe();
  const updateProfile = useUpdateProfile();
  const roles = useSessionStore((s) => s.roles);
  const setActiveRole = useSessionStore((s) => s.setActiveRole);
  const clearSession = useSessionStore((s) => s.clear);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  // Les champs se remplissent une seule fois depuis le profil chargé.
  useEffect(() => {
    if (!user) return;
    setFullName(`${user.firstName} ${user.lastName}`.trim());
    setPhone(user.phone ?? '');
  }, [user]);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const hasMemberRole = roles.some((r) => r === 'MEMBER');
  const specialties = user?.specialties ?? [];

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = () => {
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    if (!firstName) return;
    updateProfile.mutate(
      { firstName, lastName: rest.join(' ') || user?.lastName || '', phone: phone.trim() || undefined },
      { onSuccess: () => showToast('Profil enregistré'), onError: () => showToast('Impossible d’enregistrer le profil') },
    );
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await tokenStorage.clear();
    clearSession();
    router.replace('/(auth)/login');
  };

  const handleSwitchToMember = () => {
    setActiveRole('MEMBER');
    router.replace(rootRouteForRole('MEMBER') as never);
  };

  const contactRows: { icon: IconName; label: string; value: string; onChange?: (v: string) => void; placeholder: string; keyboardType?: 'default' | 'phone-pad'; verified?: boolean }[] = [
    { icon: 'badge', label: 'Nom complet', value: fullName, onChange: setFullName, placeholder: 'Nom' },
    { icon: 'mail-outline', label: 'Email', value: user?.email ?? '', placeholder: 'email@salle.fr', verified: !!user?.email },
    { icon: 'call', label: 'Téléphone', value: phone, onChange: setPhone, placeholder: '06 00 00 00 00', keyboardType: 'phone-pad' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView {...tabBarScroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.avatarShadow}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.name}>{user ? `${user.firstName} ${user.lastName}` : ''}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Coach</Text>
          </View>
        </View>

        {specialties.length > 0 ? (
          <View>
            <Text style={styles.groupTitle}>Spécialités</Text>
            <View style={styles.chips}>
              {specialties.map((s) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <Text style={styles.groupTitle}>Coordonnées</Text>
          <View style={[styles.card, cardShadow, { padding: 6 }]}>
            {contactRows.map((r, i) => (
              <View key={r.label} style={[styles.contactRow, i < contactRows.length - 1 && styles.rowBorder]}>
                <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.contactIcon}>
                  <MaterialIcons name={r.icon} size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.contactLabelRow}>
                    <Text style={styles.contactLabel}>{r.label.toUpperCase()}</Text>
                    {r.verified ? (
                      <View style={styles.verified}>
                        <MaterialIcons name="check" size={12} color={colors.successInk} />
                        <Text style={styles.verifiedText}>Vérifié</Text>
                      </View>
                    ) : null}
                  </View>
                  <TextInput
                    value={r.value}
                    onChangeText={r.onChange}
                    editable={!!r.onChange}
                    placeholder={r.placeholder}
                    placeholderTextColor={colors.muted}
                    keyboardType={r.keyboardType}
                    autoCapitalize={r.keyboardType ? 'none' : 'words'}
                    style={[styles.contactInput, !r.onChange && { color: colors.muted }]}
                  />
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>Ces informations servent à vous contacter et à sécuriser votre compte.</Text>
        </View>

        <View>
          <Text style={styles.groupTitle}>Sécurité</Text>
          <View style={[styles.card, cardShadow, { paddingHorizontal: 16 }]}>
            <Pressable style={styles.navRow} onPress={() => router.push('/(member)/account-security')}>
              <View style={{ flex: 1 }}>
                <Text style={styles.navTitle}>Changer le mot de passe</Text>
                <Text style={styles.navSub}>Modifier votre mot de passe de connexion</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={styles.groupTitle}>Mes données</Text>
          <View style={[styles.card, cardShadow, { paddingHorizontal: 16 }]}>
            <Pressable style={styles.navRow} onPress={() => router.push('/(member)/account-delete')}>
              <View style={[styles.dangerIcon]}>
                <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.navTitle, { color: colors.dangerInk }]}>Supprimer mon compte</Text>
                <Text style={styles.navSub}>Action irréversible</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {hasMemberRole ? (
          <Pressable style={styles.switchRow} onPress={handleSwitchToMember}>
            <MaterialIcons name="swap-horiz" size={22} color={colors.primaryInk} />
            <Text style={styles.switchText}>Passer en mode adhérent</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleSave}
          disabled={updateProfile.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, updateProfile.isPending && { opacity: 0.7 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer le profil'}</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.logout, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => setLogoutVisible(true)}>
          <MaterialIcons name="logout" size={22} color={colors.text} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={logoutVisible} onClose={() => setLogoutVisible(false)}>
        <Text style={styles.sheetTitle}>Se déconnecter ?</Text>
        <Text style={styles.sheetText}>Vous devrez vous reconnecter pour accéder à l’application.</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Se déconnecter" onPress={handleLogout} variant="secondary" />
          <Button label="Annuler" onPress={() => setLogoutVisible(false)} variant="outline" />
        </View>
      </BottomSheet>

      {toast ? <Toast icon="check-circle" text={toast} iconColor={colors.success} /> : null}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140, paddingTop: spacing.sm },
    header: { alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 6 },
    avatarShadow: {
      width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.primary, padding: 4,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
      backgroundColor: colors.bg,
    },
    avatar: { flex: 1, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -0.9, color: '#FFFFFF' },
    name: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: colors.text, marginTop: 10, textAlign: 'center' },
    rolePill: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    rolePillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    groupTitle: {
      fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase', marginLeft: 4, marginBottom: 8,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    contactIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    contactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    contactLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, color: colors.muted },
    verified: {
      flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.successSoft,
    },
    verifiedText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.successInk },
    contactInput: { height: 30, padding: 0, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 8, marginLeft: 6 },
    navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
    navTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    navSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    dangerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
    switchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, borderRadius: 18,
      backgroundColor: colors.primarySoft,
    },
    switchText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    ctaShadow: {
      borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 6,
    },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    logout: {
      minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    logoutText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19 },
  });
}
