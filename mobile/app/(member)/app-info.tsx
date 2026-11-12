import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Image, LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { ScreenTitle } from '../../src/components/ui';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { haptics } from '../../src/utils/haptics';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';

const LOGO_MARK = require('../../assets/brand/logo-mark.png');
const LOGO_WORD = require('../../assets/brand/logo-word.png');

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
  const pullClient = useQueryClient();
  const { refreshing: pullRefreshing, onRefresh: pullOnRefresh } = useOfflineAwareRefresh(() => pullClient.invalidateQueries());
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const version = Constants.expoConfig?.version ?? '—';
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (title: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    haptics.selection();
    setOpen((cur) => (cur === title ? null : title));
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/(tabs)/profile'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={pullOnRefresh} />} contentContainerStyle={styles.container}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.profil')}</Text>
        </Pressable>
        <ScreenTitle title={t('member.a_propos')} subtitle={t('member.informations_sur_lapplication_et_votre')} />

        <LinearGradient colors={[colors.hero, colors.hero2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroDecor} />
          <Image source={LOGO_MARK} resizeMode="contain" style={styles.heroMark} accessibilityLabel={t('member.muscleup')} />
          <Image source={LOGO_WORD} resizeMode="contain" style={styles.heroWord} />
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>{t('member.version', { version })}</Text>
          </View>
        </LinearGradient>

        <View style={[styles.list, cardShadow]}>
          {SECTIONS.map((s, i) => {
            const isOpen = open === s.title;
            return (
              <View key={s.title} style={i > 0 && styles.rowDivider}>
                <Pressable onPress={() => toggle(s.title)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                  <View style={styles.iconTile}>
                    <MaterialIcons name={s.icon} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.sectionTitle}>{s.title}</Text>
                  <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={24} color={colors.muted} />
                </Pressable>
                {isOpen ? <Text style={styles.sectionText}>{s.text}</Text> : null}
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>© {new Date().getFullYear()} MuscleUP</Text>
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
    hero: { borderRadius: radii.xl, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 6, overflow: 'hidden' },
    heroDecor: { position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' },
    heroMark: { width: 170, height: 58 },
    heroWord: { width: 170, height: 16 },
    versionPill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginTop: 14 },
    versionText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.4, color: '#FFFFFF' },
    list: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64 },
    iconTile: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { flex: 1, fontFamily: fonts.headBold, fontSize: 15.5, letterSpacing: -0.2, color: colors.text },
    sectionText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, paddingBottom: 16, paddingStart: 52 },
    footer: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4 },
  });
}
