import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface AvatarProps {
  initials: string;
  size?: number;
  background?: string;
  color?: string;
}

export function Avatar({ initials, size = 44, background, color }: AvatarProps) {
  const { colors } = useTheme();
  const bg = background ?? colors.secondarySoft;
  const fg = color ?? colors.secondaryInk;
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
