import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/** Photo / logo de la salle : remplit tout le cadre (sans marge ni bordure), coins aux rayons de l'app ;
 * sa première lettre sur fond de couleur quand aucune image n'est importée. */
export function VenueLogo({ name, logoUrl, size = 52 }: { name: string; logoUrl: string | null; size?: number }) {
  const { colors } = useTheme();
  const radius = size >= 90 ? radii.lg : size >= 56 ? radii.md : radii.sm;
  if (logoUrl) {
    return (
      <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: colors.surface2, borderWidth: 0 }]}>
        <Image source={{ uri: logoUrl }} style={{ width: size, height: size }} contentFit="cover" transition={200} />
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
