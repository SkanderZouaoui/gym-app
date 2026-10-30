import { useMemo } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { ScreenTitle } from '../../src/components/ui';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';

type IconName = keyof typeof MaterialIcons.glyphMap;

const SECTIONS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'gavel',
    get title() { return i18n.t('member.reglement_interieur'); },
    get text() { return i18n.t('member.le_respect_du_materiel_des'); },
  },
  {
    icon: 'description',
    get title() { return i18n.t('member.mentions_legales'); },
    text:
      'MuscleUP est un service proposé par votre salle de sport. Les données personnelles collectées sont utilisées uniquement pour la gestion de votre abonnement, de votre présence et des fonctionnalités de l’application (planning, réservations, suivi d’entraînement).',
  },
  {
    icon: 'shield',
    get title() { return i18n.t('member.confidentialite'); },
    get text() { return i18n.t('member.vos_photos_de_profil_et_2'); },
  },
  {
    icon: 'mail-outline',
    get title() { return i18n.t('common.contact'); },
    get text() { return i18n.t('member.pour_toute_question_contactez_laccueil'); },
  },
  { icon: 'favorite-border', get title() { return i18n.t('member.credits'); }, get text() { return i18n.t('member.donnees_des_exercices_fournies_par'); } },
];

/** À propos : identité de l'application, règlement, mentions légales, confidentialité, contact, crédits. */
export default function AppInfoScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const version = Constants.expoConfig?.version ?? '—';

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/profile'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.profil')}</Text>
        </Pressable>
        <ScreenTitle title={t('member.a_propos')} subtitle={t('member.informations_sur_lapplication_et_votre')} />

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.logo}>
              <Text style={styles.logoText}>{t('common.mu')}</Text>
            </View>
            <Text style={styles.appName}>{t('member.muscleup')}</Text>
            <View style={styles.versionPill}>
              <Text style={styles.versionText}>{t('member.version', { version })}</Text>
            </View>
          </LinearGradient>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={[styles.card, cardShadow]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconTile}>
                <MaterialIcons name={s.icon} size={22} color={colors.primaryInk} />
              </View>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>
            <Text style={styles.sectionText}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 120 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    heroShadow: {
      borderRadius: radii.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
    },
    hero: { borderRadius: radii.xl, padding: 24, alignItems: 'center', gap: 10, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
    logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    logoText: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.5, color: '#FFFFFF' },
    appName: { fontFamily: fonts.head, fontSize: 28, letterSpacing: -1, color: '#FFFFFF' },
    versionPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    versionText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    card: { padding: 16, gap: 10, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconTile: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
    sectionText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted },
  });
}
