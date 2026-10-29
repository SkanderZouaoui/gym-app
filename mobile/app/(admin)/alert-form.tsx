import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAdminHomeAlerts, useDeleteHomeAlert, useSaveHomeAlert, type AdminHomeAlert } from '../../src/hooks/useAdmin';
import { Banner, ScreenTitle } from '../../src/components/ui';

const LEVELS: { value: AdminHomeAlert['level']; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'info', label: 'Information', icon: 'info' },
  { value: 'warn', label: 'Avertissement', icon: 'warning' },
  { value: 'urgent', label: 'Urgent', icon: 'error' },
];
const AUDIENCES: AdminHomeAlert['audience'][] = ['Tous', 'Actifs', 'Expirés'];

const toDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

/** Création / modification d'une alerte affichée sur l'accueil des adhérents, avec aperçu. */
export default function AdminAlertFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: alerts } = useAdminHomeAlerts();
  const save = useSaveHomeAlert();
  const remove = useDeleteHomeAlert();
  const existing = id ? (alerts ?? []).find((a) => a.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [level, setLevel] = useState<AdminHomeAlert['level']>(existing?.level ?? 'info');
  const [audience, setAudience] = useState<AdminHomeAlert['audience']>(existing?.audience ?? 'Tous');
  const [startsOn, setStartsOn] = useState(existing?.startsOn.slice(0, 10) ?? toDay(0));
  const [endsOn, setEndsOn] = useState(existing?.endsOn.slice(0, 10) ?? toDay(7));
  const [error, setError] = useState<string | null>(null);

  // Édition : les champs se remplissent à l'arrivée des données si l'écran a été ouvert avant leur chargement.
  const [hydrated, setHydrated] = useState(!!existing || !id);
  if (!hydrated && existing) {
    setHydrated(true);
    setTitle(existing.title);
    setMessage(existing.message);
    setLevel(existing.level);
    setAudience(existing.audience);
    setStartsOn(existing.startsOn.slice(0, 10));
    setEndsOn(existing.endsOn.slice(0, 10));
  }

  const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const valid = title.trim() && message.trim() && dateOk(startsOn) && dateOk(endsOn) && startsOn <= endsOn;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/alerts'));

  const tone =
    level === 'urgent'
      ? { bg: colors.dangerSoft, ink: colors.dangerInk, icon: 'error' as const }
      : level === 'warn'
        ? { bg: colors.warningSoft, ink: colors.warningInk, icon: 'warning' as const }
        : { bg: colors.primarySoft, ink: colors.primaryInk, icon: 'info' as const };

  const submit = () => {
    setError(null);
    save.mutate(
      { id, data: { title: title.trim(), message: message.trim(), level, audience, startsOn, endsOn, isActive: existing?.isActive ?? true } },
      { onSuccess: goBack, onError: () => setError('Impossible d’enregistrer l’alerte.') },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Alertes</Text>
        </Pressable>
        <ScreenTitle title={existing ? 'Modifier l’alerte' : 'Nouvelle alerte'} subtitle="Affichée en haut de l’accueil des adhérents" />

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <View>
          <Text style={styles.label}>Niveau</Text>
          <View style={styles.pillRow}>
            {LEVELS.map((l) => {
              const active = level === l.value;
              return (
                <Pressable key={l.value} onPress={() => setLevel(l.value)} style={styles.pill}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  ) : null}
                  <MaterialIcons name={l.icon} size={16} color={active ? '#FFFFFF' : colors.muted} />
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{l.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Titre</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Ex. Fermeture exceptionnelle" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Votre message aux adhérents"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' }]}
          />
        </View>

        <View>
          <Text style={styles.label}>Audience</Text>
          <View style={styles.pillRow}>
            {AUDIENCES.map((a) => {
              const active = audience === a;
              return (
                <Pressable key={a} onPress={() => setAudience(a)} style={styles.pill}>
                  {active ? (
                    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  ) : null}
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{a}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.dates}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Du (AAAA-MM-JJ)</Text>
            <TextInput value={startsOn} onChangeText={setStartsOn} placeholder="2026-10-29" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Au (AAAA-MM-JJ)</Text>
            <TextInput value={endsOn} onChangeText={setEndsOn} placeholder="2026-11-05" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />
          </View>
        </View>

        <View>
          <Text style={styles.previewTitle}>Aperçu sur l’écran adhérent</Text>
          <View style={[styles.preview, { backgroundColor: tone.bg }]}>
            <MaterialIcons name={tone.icon} size={24} color={tone.ink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewHead, { color: tone.ink }]}>{title || 'Titre de l’alerte'}</Text>
              <Text style={[styles.previewBody, { color: tone.ink }]}>{message || 'Votre message aux adhérents'}</Text>
            </View>
            <MaterialIcons name="close" size={20} color={tone.ink} />
          </View>
        </View>

        {existing ? (
          <Pressable style={[styles.delete, cardShadow]} onPress={() => remove.mutate(existing.id, { onSuccess: goBack })}>
            <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
            <Text style={styles.deleteText}>Supprimer l’alerte</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={submit}
          disabled={!valid || save.isPending}
          style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, (!valid || save.isPending) && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
            <Text style={styles.ctaText}>{save.isPending ? 'Enregistrement…' : existing ? 'Enregistrer' : 'Publier l’alerte'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 150 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginBottom: 8 },
    input: {
      minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      paddingHorizontal: 16, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      height: 38, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    pillText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
    pillTextActive: { color: colors.primaryContrast },
    dates: { flexDirection: 'row', gap: 10 },
    previewTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    preview: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 14 },
    previewHead: { fontFamily: fonts.bodyBold, fontSize: 14 },
    previewBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
    delete: {
      minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    deleteText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.dangerInk },
    footer: {
      position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg,
      borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl,
    },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
