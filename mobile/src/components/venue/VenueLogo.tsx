import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/** Logo de la salle, ou sa première lettre sur fond de couleur quand aucun logo n'est importé. */
export function VenueLogo({ name, logoUrl, size = 52 }: { name: string; logoUrl: string | null; size?: number }) {
  const { colors } = useTheme();
  const radius = size * 0.3;
  if (logoUrl) {
    return (
      <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image source={{ uri: logoUrl }} style={{ width: size * 0.8, height: size * 0.8 }} contentFit="contain" transition={200} />
      </View>
    );
  }
  return (
    <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.box, { width: size, height: size, borderRadius: radius, borderWidth: 0 }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42, color: colors.primaryContrast }]}>{(name.trim()[0] ?? 'M').toUpperCase()}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  initial: { fontFamily: fonts.head, letterSpacing: -0.5 },
});
