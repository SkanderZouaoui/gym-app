import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useStaffRoutes } from '../../src/navigation/staffRoutes';
import { useTheme } from '../../src/theme/ThemeContext';
import { TextField } from '../../src/components/TextField';
import { Banner, ScreenTitle } from '../../src/components/ui';
import { useCreateMember, type PaymentMethod } from '../../src/hooks/useStaff';
import { usePlans } from '../../src/hooks/usePlans';
import { useOrganizationConfig } from '../../src/hooks/useAdmin';
import { METHOD_ICON, METHOD_LABEL, formatMoney } from '../../src/components/staff/staffUi';
import { ApiError } from '../../src/api/client';

function describeError(e: unknown): { title: string; text: string; field?: 'email' | 'phone' } {
  if (!(e instanceof ApiError)) {
    return { title: 'Connexion impossible', text: 'Vérifiez votre connexion internet puis réessayez.' };
  }
  switch (e.code) {
    case 'EMAIL_ALREADY_USED':
      return {
        title: 'Cette adresse e-mail existe déjà',
        text: 'Un compte utilise déjà cette adresse. Saisissez une autre adresse, ou retrouvez l’adhérent dans la liste.',
        field: 'email',
      };
    case 'PHONE_ALREADY_USED':
      return {
        title: 'Ce numéro de téléphone existe déjà',
        text: 'Un compte utilise déjà ce numéro. Saisissez un autre numéro ou laissez le champ vide.',
        field: 'phone',
      };
    case 'EMAIL_OR_PHONE_ALREADY_USED':
      return { title: 'Compte déjà existant', text: 'Cet e-mail ou ce téléphone est déjà utilisé par un autre compte.' };
    case 'FORBIDDEN':
      return { title: 'Action non autorisée', text: 'Votre profil ne permet pas de créer un compte adhérent.' };
  }
  if (e.status === 400) {
    return { title: 'Informations invalides', text: 'Vérifiez le prénom, le nom, l’e-mail et le téléphone saisis.' };
  }
  if (e.status >= 500) {
    return { title: 'Service indisponible', text: 'Le serveur a rencontré un problème. Réessayez dans un instant.' };
  }
  return { title: 'Création impossible', text: `Le compte n’a pas pu être créé (${e.code}).` };
}

function planDuration(days: number): string {
  if (days >= 360) return `${Math.round(days / 365)} an${days >= 730 ? 's' : ''}`;
  if (days >= 28) return `${Math.round(days / 30)} mois`;
  return `${days} jours`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function Section({ icon, title, children }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; children: React.ReactNode }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <MaterialIcons name={icon} size={16} color={colors.primaryInk} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={[styles.card, cardShadow]}>{children}</View>
    </View>
  );
}

/** Nouveau compte adhérent créé à l'accueil (mot de passe provisoire communiqué sur place). */
export default function StaffMemberCreateScreen() {
  const routes = useStaffRoutes();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const createMember = useCreateMember();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<{ title: string; text: string; field?: 'email' | 'phone' } | null>(null);
  const { data: plans } = usePlans({ all: true });
  const { data: orgConfig } = useOrganizationConfig();
  const [planId, setPlanId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [copied, setCopied] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string; name: string; code?: string | null; password: string; plan: string; amount: number; method: PaymentMethod; paymentId?: string;
  } | null>(null);

  const emailOk = /\S+@\S+\.\S+/.test(email);
  const plan = (plans ?? []).find((p) => p.id === planId);
  const valid = !!(firstName.trim() && lastName.trim() && emailOk && plan);
  const initials = `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`.toUpperCase();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(routes.members));

  const submit = () => {
    setError(null);
    const password = generatePassword();
    if (!plan) return;
    createMember.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() || undefined, password, planId: plan!.id, paymentMethod: method },
      {
        onSuccess: (m) =>
          setCreated({
            id: m.id, name: `${m.firstName} ${m.lastName}`, code: m.memberCode, password,
            plan: plan!.name, amount: m.payment?.amount ?? Math.round(Number(plan!.price)), method, paymentId: m.payment?.id,
          }),
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  if (created) {
    const code = created.code ?? '';
    const shareText =
      `Bienvenue chez MuscleUP, ${created.name} !\n\n` +
      `E-mail : ${email.trim()}\nMot de passe provisoire : ${created.password}\n` +
      (code ? `Code de pointage : ${code.slice(0, 3)} ${code.slice(3)}\n` : '') +
      `\nPensez à modifier votre mot de passe à la première connexion.`;
    const copy = async (key: string, value: string) => {
      await Clipboard.setStringAsync(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    };
    const initialsDone = created.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 40 }]}>
          <View style={styles.heroShadow}>
            <LinearGradient colors={['#10B981', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.successHero}>
              <View style={styles.heroDecorA} />
              <View style={styles.heroDecorB} />
              <View style={styles.successBadge}>
                <MaterialIcons name="check" size={18} color="#047857" />
                <Text style={styles.successBadgeText}>COMPTE CRÉÉ</Text>
              </View>
              <View style={styles.successAvatar}>
                <Text style={styles.successAvatarText}>{initialsDone}</Text>
              </View>
              <Text style={styles.successName}>{created.name}</Text>
              <Text style={styles.successMail} numberOfLines={1}>{email.trim()}</Text>
            </LinearGradient>
          </View>

          <View style={[styles.card, cardShadow]}>
            <View style={styles.credHead}>
              <Text style={styles.credLabel}>Abonnement encaissé</Text>
            </View>
            <View style={styles.recapRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{created.plan}</Text>
                <Text style={styles.planSub}>{METHOD_LABEL[created.method]}</Text>
              </View>
              <Text style={styles.recapAmount}>{formatMoney(created.amount)}</Text>
            </View>
          </View>

          <View style={[styles.card, cardShadow]}>
            <View style={styles.credHead}>
              <Text style={styles.credLabel}>Code de pointage</Text>
              {code ? (
                <Pressable onPress={() => copy('code', code)} hitSlop={8} style={styles.copyBtn}>
                  <MaterialIcons name={copied === 'code' ? 'check' : 'content-copy'} size={14} color={colors.primaryInk} />
                  <Text style={styles.copyText}>{copied === 'code' ? 'Copié' : 'Copier'}</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.codeRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.codeBox}>
                  <Text style={styles.codeDigit}>{code[i] ?? '–'}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, cardShadow]}>
            <View style={styles.credHead}>
              <Text style={styles.credLabel}>Mot de passe provisoire</Text>
              <Pressable onPress={() => copy('pwd', created.password)} hitSlop={8} style={styles.copyBtn}>
                <MaterialIcons name={copied === 'pwd' ? 'check' : 'content-copy'} size={14} color={colors.primaryInk} />
                <Text style={styles.copyText}>{copied === 'pwd' ? 'Copié' : 'Copier'}</Text>
              </Pressable>
            </View>
            <Text style={styles.password} selectable>{created.password}</Text>
            <View style={styles.warn}>
              <MaterialIcons name="visibility-off" size={16} color={colors.warningInk} />
              <Text style={styles.warnText}>Affiché une seule fois. L’adhérent pourra le modifier depuis son profil.</Text>
            </View>
          </View>

          <Pressable onPress={() => Share.share({ message: shareText })} style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <MaterialIcons name="ios-share" size={22} color={colors.primaryContrast} />
              <Text style={styles.ctaText}>Partager les accès</Text>
            </LinearGradient>
          </Pressable>
          {created.paymentId ? (
            <Pressable
              onPress={() => router.replace({ pathname: routes.cashReceipt, params: { paymentId: created.paymentId!, fresh: '1' } })}
              style={({ pressed }) => [styles.outlineBtn, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Text style={styles.outlineText}>Voir le reçu</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.replace(routes.member(created.id))} style={({ pressed }) => [styles.outlineBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
            <Text style={styles.outlineText}>Voir la fiche adhérent</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCreated(null);
              setFirstName('');
              setLastName('');
              setEmail('');
              setPhone('');
              setPlanId(null);
            }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Créer un autre compte</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Adhérents</Text>
        </Pressable>
        <ScreenTitle title="Nouveau compte" subtitle="Compte, abonnement et encaissement en une étape" />

        <View style={styles.hero}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            {initials ? <Text style={styles.avatarText}>{initials}</Text> : <MaterialIcons name="person-add" size={34} color="#FFFFFF" />}
          </LinearGradient>
          <Text style={styles.heroName}>{`${firstName} ${lastName}`.trim() || 'Nouvel adhérent'}</Text>
          <Text style={styles.heroHint}>Le code de pointage est attribué automatiquement.</Text>
        </View>

        {error ? <Banner tone="danger" icon="error" title={error.title} text={error.text} /> : null}

        <Section icon="badge" title="Identité">
          <TextField label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <TextField label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        </Section>

        <Section icon="alternate-email" title="Contact">
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={error?.field === 'email' ? 'Déjà utilisée' : email.length > 3 && !emailOk ? 'Adresse e-mail invalide' : undefined}
          />
          <TextField
            label="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Optionnel"
            error={error?.field === 'phone' ? 'Déjà utilisé' : undefined}
          />
        </Section>

        <Section icon="card-membership" title="Abonnement">
          <View style={{ gap: 10 }}>
            {(plans ?? []).map((p) => {
              const active = p.id === planId;
              return (
                <Pressable key={p.id} onPress={() => setPlanId(p.id)} style={[styles.planRow, active && styles.planRowActive]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <Text style={styles.planSub} numberOfLines={1}>{planDuration(p.durationDays)}{p.includesLabel ? ` · ${p.includesLabel}` : ''}</Text>
                  </View>
                  <Text style={styles.planPrice}>{formatMoney(p.price)}</Text>
                  <View style={[styles.radio, active && { borderColor: colors.primary }]}>{active ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section icon="payments" title="Paiement encaissé">
          <View style={styles.methodGrid}>
            {(['CASH', 'OTHER', 'TRANSFER', 'CHECK'] as PaymentMethod[]).filter((m) => orgConfig?.paymentMethods[m] !== false).map((m) => {
              const active = method === m;
              return (
                <Pressable key={m} onPress={() => setMethod(m)} style={[styles.methodChip, active && styles.methodChipActive]}>
                  <MaterialIcons name={METHOD_ICON[m]} size={18} color={active ? colors.primaryContrast : colors.primaryInk} />
                  <Text style={[styles.methodText, active && { color: colors.primaryContrast }]}>{METHOD_LABEL[m]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <View style={styles.autoBox}>
          <View style={styles.sectionIcon}>
            <MaterialIcons name="lock" size={16} color={colors.primaryInk} />
          </View>
          <Text style={styles.autoText}>
            Un mot de passe provisoire sécurisé sera généré automatiquement et affiché une seule fois à la création.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={submit}
          disabled={!valid || createMember.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, (!valid || createMember.isPending) && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="point-of-sale" size={22} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{createMember.isPending ? 'Création…' : plan ? `Créer et encaisser ${formatMoney(plan.price)}` : 'Choisir un abonnement'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    planRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.md,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    planRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    planName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    planSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 1 },
    planPrice: { fontFamily: fonts.head, fontSize: 16, color: colors.text },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    methodChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 21,
      backgroundColor: colors.primarySoft,
    },
    methodChipActive: { backgroundColor: colors.primary },
    methodText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    recapRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    recapAmount: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.6, color: colors.text },
    hero: { alignItems: 'center', gap: 6, paddingVertical: 6 },
    avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -1, color: '#FFFFFF' },
    heroName: { fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.6, color: colors.text },
    heroHint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textAlign: 'center', maxWidth: 280 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    autoBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radii.lg,
      backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder,
    },
    autoText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.primaryInk },
    heroShadow: { borderRadius: radii.xl, shadowColor: '#059669', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
    successHero: { borderRadius: radii.xl, padding: 24, alignItems: 'center', gap: 6, overflow: 'hidden' },
    heroDecorA: { position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroDecorB: { position: 'absolute', left: -40, bottom: -60, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
    successBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 12, borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.95)', marginBottom: 10,
    },
    successBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: '#047857' },
    successAvatar: {
      width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    },
    successAvatarText: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.8, color: '#FFFFFF' },
    successName: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.9, color: '#FFFFFF', textAlign: 'center', marginTop: 6 },
    successMail: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.88)' },
    credHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    credLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.primarySoft },
    copyText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    codeRow: { flexDirection: 'row', gap: 8 },
    codeBox: { flex: 1, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    codeDigit: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
    password: { fontFamily: fonts.head, fontSize: 26, letterSpacing: 2, color: colors.text, textAlign: 'center', paddingVertical: 10 },
    warn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.warningSoft },
    warnText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, color: colors.warningInk },
    outlineBtn: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    outlineText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    secondaryBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.muted },
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
