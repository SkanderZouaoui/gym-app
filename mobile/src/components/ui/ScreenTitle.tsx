import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface ScreenTitleProps {
  title: string;
  subtitle?: string;
  /** Élément aligné à droite du titre (lien, bouton…). */
  right?: ReactNode;
}

/** Grand titre d'écran racine v2 (34 pt gras, interlettrage serré) + sous-titre optionnel. */
export function ScreenTitle({ title, subtitle, right }: ScreenTitleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: 10, paddingBottom: 6 },
    text: { flex: 1 },
    title: { ...typography.largeTitle, lineHeight: 37, color: colors.text },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 4 },
  });
}
