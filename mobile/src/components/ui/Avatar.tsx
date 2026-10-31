import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface AvatarProps {
  initials: string;
  size?: number;
  background?: string;
  color?: string;
  /** Photo de profil (URL signée) : affichée à la place des initiales, qui servent de repli si elle est illisible. */
  photoUrl?: string | null;
}

export function Avatar({ initials, size = 44, background, color, photoUrl }: AvatarProps) {
  const { colors } = useTheme();
  const bg = background ?? colors.secondarySoft;
  const fg = color ?? colors.secondaryInk;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (photoUrl && failedUrl !== photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        onError={() => setFailedUrl(photoUrl)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface2 }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg, fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.headBold },
});
