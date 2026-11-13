import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/** En-tête des fenêtres de confirmation (suppression, annulation, déconnexion) : pastille d'icône, titre et texte centrés. */
export function SheetAlert({ icon = 'delete-outline', tone = 'danger', title, text }: { icon?: keyof typeof MaterialIcons.glyphMap; tone?: 'danger' | 'success'; title: string; text?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, tone === 'success' && { backgroundColor: colors.successSoft }]}>
        <MaterialIcons name={icon} size={30} color={tone === 'success' ? colors.successInk : colors.dangerInk} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 6, marginBottom: 8 },
    icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft, marginBottom: 8 },
    title: { fontFamily: fonts.headBold, fontSize: 19, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
    text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  });
}
