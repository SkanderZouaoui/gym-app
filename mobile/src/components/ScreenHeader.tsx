import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSessionStore } from '../store/session';
import { rootRouteForRole } from '../navigation/roleRoutes';

interface ScreenHeaderProps {
  title: string;
  /** Route de repli si la pile de navigation est vide (ex. ouverture directe
   * par deep link, ou écran ouvert en premier après un redémarrage) — par
   * défaut la racine du rôle, mais un écran peut pointer vers son parent
   * logique (ex. "training" pour un détail de programme). N'est utilisée
   * QUE quand il n'y a pas de véritable historique de navigation : sinon le
   * bouton retour doit toujours revenir à l'écran précédent réellement visité. */
  fallbackHref?: string;
}

export function ScreenHeader({ title, fallbackHref }: ScreenHeaderProps) {
  const activeRole = useSessionStore((s) => s.activeRole);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Les écrans de détail sont désormais poussés sur un vrai Stack (voir
  // app/(member)/_layout.tsx, app/(coach)/_layout.tsx), donc router.canGoBack()
  // reflète l'historique réel de navigation — on le respecte en priorité.
  // fallbackHref ne sert qu'en dernier recours (ouverture directe par deep
  // link, pile vide).
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (fallbackHref) {
      router.navigate(fallbackHref as never);
      return;
    }
    router.navigate(rootRouteForRole(activeRole ?? 'MEMBER') as never);
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
        <MaterialIcons name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: fonts.headSemiBold, fontSize: 17, color: colors.text },
  });
}
