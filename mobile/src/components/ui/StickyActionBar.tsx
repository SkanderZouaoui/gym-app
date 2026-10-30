import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useTabBarStore } from '../../store/tabBar';
import { useTranslation } from 'react-i18next';

interface Props {
  /** Affichée seulement quand il y a quelque chose à enregistrer. */
  visible: boolean;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  /** Écran d'onglets : la barre se pose au-dessus de la barre flottante, et redescend en bas quand celle-ci se replie. */
  aboveTabBar?: boolean;
}

/** Barre d'action fixée en bas de l'écran : le bouton d'enregistrement reste visible sans défiler. */
export function StickyActionBar({ visible, label, loading, disabled, icon = 'check', onPress, aboveTabBar }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const suppress = useTabBarStore((st) => st.suppress);
  // Sur un écran d'onglets, la barre flottante se replie tant que le bouton d'enregistrement est affiché :
  // le bouton reste ainsi collé en bas, sans espace vide dessous.
  useEffect(() => {
    if (!visible || !aboveTabBar) return;
    suppress(1);
    return () => suppress(-1);
  }, [visible, aboveTabBar, suppress]);
  if (!visible) return null;
  const off = disabled || loading;
  return (
    <View style={styles.bar}>
      <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [styles.shadow, off && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.98 }] }]}>
        <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          <MaterialIcons name={icon} size={22} color={colors.primaryContrast} />
          <Text style={styles.text}>{loading ? t('common.enregistrement') : label}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/** Marge à ajouter en bas du contenu défilant pour que la barre ne cache rien. */
export const STICKY_BAR_SPACE = 120;

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    bar: {
      position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl,
      backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
    },
    shadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    text: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
