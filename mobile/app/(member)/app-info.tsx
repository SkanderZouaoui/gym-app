import { useMemo } from 'react';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AppInfoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="À propos" fallbackHref="/(member)/settings" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.appName}>MuscleUP</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>

        <Section title="Règlement intérieur">
          Le respect du matériel, des autres adhérents et des coachs est requis à tout moment dans la salle.
          L’accès nécessite une présentation du QR d’accès ou du badge à l’accueil. Toute dégradation volontaire
          du matériel pourra être facturée.
        </Section>

        <Section title="Mentions légales">
          MuscleUP est un service proposé par votre salle de sport. Les données personnelles collectées sont
          utilisées uniquement dans le cadre de la gestion de votre abonnement, de votre présence et des
          fonctionnalités de l’application (fidélité, communauté, boutique).
        </Section>

        <Section title="Confidentialité">
          Vos photos de profil et de progression sont privées et ne sont jamais partagées publiquement. Vous
          pouvez demander la suppression de votre compte à tout moment depuis les Paramètres.
        </Section>

        <Section title="Contact">
          Pour toute question, contactez l’accueil de votre salle ou votre coach via la messagerie de
          l’application.
        </Section>

        <Section title="Crédits">
          Exercise data by RepDB (repdb.co)
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: 120 },
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 6,
    },
    appName: { fontFamily: fonts.headBold, fontSize: 20, color: colors.text, textAlign: 'center' },
    version: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
    sectionTitle: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    sectionText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 19 },
  });
}
