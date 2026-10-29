import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { TextField } from '../../src/components/TextField';
import { Banner, ScreenTitle } from '../../src/components/ui';
import { useCreateMember } from '../../src/hooks/useStaff';
import { ApiError } from '../../src/api/client';

/** Nouveau compte adhérent créé à l'accueil (mot de passe provisoire communiqué sur place). */
export default function StaffMemberCreateScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const createMember = useCreateMember();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const valid = firstName.trim() && lastName.trim() && /\S+@\S+\.\S+/.test(email) && password.length >= 8;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(staff)/(tabs)/members'));

  const submit = () => {
    setError(null);
    createMember.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() || undefined, password },
      {
        onSuccess: (created) => router.replace(`/(staff)/member/${created.id}`),
        onError: (e) =>
          setError(e instanceof ApiError && e.code === 'EMAIL_OR_PHONE_ALREADY_USED' ? 'Cet e-mail ou ce téléphone est déjà utilisé.' : 'Impossible de créer le compte.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Adhérents</Text>
        </Pressable>
        <ScreenTitle title="Nouveau compte" subtitle="Le mot de passe provisoire est communiqué à l’adhérent sur place." />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <View style={[styles.card, cardShadow]}>
          <TextField label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <TextField label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optionnel" />
          <TextField label="Mot de passe provisoire (8 caractères min.)" value={password} onChangeText={setPassword} isPassword />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={submit}
          disabled={!valid || createMember.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, (!valid || createMember.isPending) && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="person-add" size={22} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{createMember.isPending ? 'Création…' : 'Créer le compte'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    card: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
