import { useMemo, useState } from 'react';
import { Link, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { authApi, meApi } from '../../src/api/endpoints';
import { tokenStorage } from '../../src/api/storage';
import { useSessionStore } from '../../src/store/session';
import { ApiError } from '../../src/api/client';
import { Banner, BottomSheet } from '../../src/components/ui';
import { useBranches } from '../../src/hooks/useBranches';

/** Inscription — FitZone App Adherent.dc.html, A4. */
export default function RegisterScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [homeBranchId, setHomeBranchId] = useState<string | null>(null);
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const setSession = useSessionStore((s) => s.setSession);
  const { data: branches } = useBranches();
  const selectedBranch = branches?.find((b) => b.id === homeBranchId);

  const handleRegister = async () => {
    if (!homeBranchId) {
      setError('Choisissez votre salle habituelle.');
      return;
    }
    if (!agreed) {
      setError("Cochez cette case pour créer votre compte.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        homeBranchId,
      });
      await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      const user = await meApi.getMe();
      setSession(user, user.branchRoles, 'MEMBER');
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? traduireErreur(e.code) : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <MaterialIcons name="mark-email-read" size={48} color={colors.successInk} />
          </View>
          <Text style={styles.successTitle}>Compte créé</Text>
          <Text style={styles.successText}>
            Un lien de confirmation a été envoyé à {email}. Votre abonnement sera activé à l’accueil de la salle, lors de votre premier règlement.
          </Text>
          <Button label="Continuer" onPress={() => router.replace('/(member)/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
              <MaterialIcons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.step}>Étape 1 sur 1</Text>
          </View>
          <Text style={styles.title}>Créer un compte</Text>

          <View style={styles.form}>
            {error ? <Banner tone="danger" icon="error" text={error} /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField label="Prénom" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Nom" value={lastName} onChangeText={setLastName} />
              </View>
            </View>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+216 22 345 678" />
            <TextField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              isPassword
              placeholder="8 caractères minimum, dont un chiffre"
            />

            <View>
              <Text style={styles.fieldLabel}>Salle habituelle</Text>
              <Pressable style={styles.branchSelector} onPress={() => setBranchSheetOpen(true)}>
                <MaterialIcons name="location-on" size={20} color={colors.primaryInk} />
                <Text style={[styles.branchSelectorText, !selectedBranch && { color: colors.muted }]}>
                  {selectedBranch?.name ?? 'Choisir une salle'}
                </Text>
                <MaterialIcons name="expand-more" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Pressable style={styles.cguRow} onPress={() => setAgreed((a) => !a)}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed ? <MaterialIcons name="check" size={16} color={colors.primaryContrast} /> : null}
              </View>
              <Text style={styles.cguText}>J’accepte les conditions d’utilisation et le règlement intérieur.</Text>
            </Pressable>

            <Button label={loading ? 'Création…' : 'Créer mon compte'} onPress={handleRegister} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Se connecter
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={branchSheetOpen} onClose={() => setBranchSheetOpen(false)}>
        <Text style={styles.sheetTitle}>Choisir une salle</Text>
        {branches?.map((b) => (
          <Pressable
            key={b.id}
            style={styles.branchOption}
            onPress={() => {
              setHomeBranchId(b.id);
              setBranchSheetOpen(false);
            }}
          >
            <Text style={styles.branchOptionText}>{b.name}</Text>
            {homeBranchId === b.id ? <MaterialIcons name="check" size={20} color={colors.primaryInk} /> : null}
          </Pressable>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

function traduireErreur(code: string): string {
  switch (code) {
    case 'EMAIL_OR_PHONE_ALREADY_USED':
      return 'Cette adresse est déjà utilisée.';
    default:
      return "Impossible de créer le compte.";
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    step: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
    title: { fontFamily: fonts.head, fontSize: 28, color: colors.text },
    form: { gap: spacing.md },
    row: { flexDirection: 'row', gap: spacing.sm },
    cguRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    checkbox: {
      width: 22, height: 22, borderRadius: radii.xs, borderWidth: 1.5, borderColor: colors.borderStrong,
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    cguText: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: colors.text, lineHeight: 18 },
    fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginBottom: 6 },
    branchSelector: {
      flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: radii.sm,
      borderWidth: 1.5, borderColor: colors.borderStrong, paddingHorizontal: 14, backgroundColor: colors.surface,
    },
    branchSelectorText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text, marginBottom: spacing.sm },
    branchOption: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    branchOptionText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
    footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    footerText: { fontFamily: fonts.body, color: colors.muted },
    footerLink: { fontFamily: fonts.bodyBold, color: colors.primaryInk },
    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
    successIcon: {
      width: 88, height: 88, borderRadius: 44, backgroundColor: colors.successSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    successTitle: { fontFamily: fonts.head, fontSize: 26, color: colors.text },
    successText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  });
}
