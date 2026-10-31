import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, KeyboardAvoidingView, Platform, type TextInputProps } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { G, Line, Path, Polyline, Rect, Text as SvgText, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/** Refonte connexion & mot de passe — Design System/FitZone Login Refonte.dc.html. */
export const VIOLET = '#7C3AED';
export const VIOLET_DARK = '#5B21B6';

export function useAuthPalette() {
  const { scheme } = useTheme();
  return scheme === 'dark'
    ? { bg: '#0F0B1E', fg: '#F5F2FF', sf: '#1A1431', bd: '#2E2650', mu: '#A29BC2', prs: 'rgba(124,58,237,0.2)', accent: '#A78BFA', dark: true }
    : { bg: '#FFFFFF', fg: '#1B1530', sf: '#F5F3FB', bd: '#E3DEF0', mu: '#6B6485', prs: '#EFE8FF', accent: VIOLET, dark: false };
}
export type AuthPalette = ReturnType<typeof useAuthPalette>;

function Hero({ compact, width, height }: { compact?: boolean; width: number; height: number }) {
  const { t } = useTranslation();
  const stripes = Array.from({ length: Math.ceil((width + height) / 26) + 1 }, (_, i) => i * 26);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height, overflow: 'hidden' }}>
      <LinearGradient colors={['#8B5CF6', '#6D28D9', '#2E1065']} locations={[0, 0.45, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
        {stripes.map((x) => (
          <Line key={x} x1={x} y1={0} x2={x - 140} y2={420} stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
        ))}
        {compact ? (
          <>
            <Rect x={0} y={122} width={width} height={8} fill="#fff" />
            <Rect x={0} y={113} width={12} height={26} rx={4} fill="#fff" />
            <Rect x={width - 12} y={113} width={12} height={26} rx={4} fill="#fff" />
            <SvgText x={26} y={114} fontSize={72} fontWeight="900" fontStyle="italic" fill="#fff">UP</SvgText>
            <SvgText x={28} y={174} fontSize={38} fontWeight="900" fontStyle="italic" fill="none" stroke="#fff" strokeWidth={1.4}>MUSCLE</SvgText>
            <G transform={`translate(${width - 390} 0)`}>
              <Path d="M330 190 L330 60" fill="none" stroke="#DDD6FE" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
              <Polyline points="317,76 330,58 343,76" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          </>
        ) : (
          <>
            <Rect x={0} y={130} width={width} height={9} fill="#fff" />
            <Rect x={0} y={120} width={14} height={29} rx={4} fill="#fff" />
            <Rect x={width - 14} y={120} width={14} height={29} rx={4} fill="#fff" />
            <SvgText x={28} y={116} fontSize={54} fontWeight="900" fontStyle="italic" fill="none" stroke="#fff" strokeWidth={1.6}>MUSCLE</SvgText>
            <SvgText x={26} y={218} fontSize={88} fontWeight="900" fontStyle="italic" fill="#fff">UP</SvgText>
            <G transform={`translate(${width - 390} 0)`}>
            <Path d="M318 252 C318 222 276 206 288 176 S308 150 300 80" fill="none" stroke="#DDD6FE" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
            <Polyline points="287,94 300,76 313,94" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={318} cy={252} r={11} fill="#fff" />
            <Circle cx={288} cy={182} r={11} fill="#fff" />
            <Circle cx={302} cy={112} r={11} fill="#fff" />
            <SvgText x={318} y={257} fontSize={13} fontWeight="800" fill={VIOLET_DARK} textAnchor="middle">1</SvgText>
            <SvgText x={288} y={187} fontSize={13} fontWeight="800" fill={VIOLET_DARK} textAnchor="middle">2</SvgText>
            <SvgText x={302} y={117} fontSize={13} fontWeight="800" fill={VIOLET_DARK} textAnchor="middle">3</SvgText>
            </G>
            <SvgText x={28} y={248} fontSize={15} fontWeight="500" fill="#fff" opacity={0.92}>{t('auth.hero_tagline')}</SvgText>
            <SvgText x={28} y={276} fontSize={12} fontWeight="700" letterSpacing={1} fill="#DDD6FE">{t('auth.hero_steps')}</SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

/** Page d'authentification : bandeau violet (grand pour la connexion, compact pour les mots de passe) + feuille arrondie. */
export function AuthScreen({ compact, topLeft, topRight, children }: { compact?: boolean; topLeft?: ReactNode; topRight?: ReactNode; children: ReactNode }) {
  const p = useAuthPalette();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const heroH = (compact ? 220 : 330) + insets.top * 0.4;
  const overlap = compact ? 32 : 54;
  const top = heroH - overlap;
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style="light" />
      <Hero compact={compact} width={width} height={heroH} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: top, flexGrow: 1 }}>
          <View
            style={{
              flexGrow: 1,
              minHeight: height - top,
              backgroundColor: p.bg,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              paddingHorizontal: 24,
              paddingTop: compact ? 22 : 24,
              paddingBottom: Math.max(insets.bottom, 16) + 16,
              shadowColor: '#140838',
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -12 },
              elevation: 12,
            }}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Au-dessus du défilement pour rester cliquables (retour, logo). */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, top: insets.top + 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>{topLeft}</View>
        <View>{topRight}</View>
      </View>
    </View>
  );
}

/** Pastille translucide posée sur le bandeau (langue, retour). */
export function HeroButton({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ height: 38, minWidth: 38, paddingHorizontal: label ? 12 : 0, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)' }}>
      <MaterialIcons name={icon} size={20} color="#fff" />
      {label ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff' }}>{label}</Text> : null}
    </Pressable>
  );
}

/** Logo (haltère) en tuile blanche, en haut à droite du bandeau. */
export function LogoTile() {
  return (
    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
      <View style={{ width: 5, height: 18, borderRadius: 2, backgroundColor: VIOLET_DARK }} />
      <View style={{ width: 5, height: 12, borderRadius: 2, backgroundColor: VIOLET_DARK, marginLeft: 2 }} />
      <View style={{ width: 10, height: 4, backgroundColor: VIOLET_DARK }} />
      <View style={{ width: 5, height: 12, borderRadius: 2, backgroundColor: VIOLET_DARK }} />
      <View style={{ width: 5, height: 18, borderRadius: 2, backgroundColor: VIOLET_DARK, marginLeft: 2 }} />
    </View>
  );
}

interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  icon: keyof typeof MaterialIcons.glyphMap;
  secure?: boolean;
  /** Petit bouton d'action à droite du champ (ex. coller le code). */
  action?: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void };
  borderColor?: string;
}

/** Champ arrondi de la refonte : icône, saisie, œil pour les mots de passe. */
export function AuthField({ icon, secure, borderColor, action, ...input }: AuthFieldProps) {
  const p = useAuthPalette();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <View style={{ height: 56, borderRadius: 18, backgroundColor: p.sf, borderWidth: 1.5, borderColor: borderColor ?? p.bd, flexDirection: 'row', alignItems: 'center', gap: 12, paddingStart: 16, paddingEnd: secure || action ? 8 : 16 }}>
      <MaterialIcons name={icon} size={22} color={p.mu} />
      <TextInput
        {...input}
        secureTextEntry={secure && !show}
        placeholderTextColor={p.mu}
        autoCapitalize={input.autoCapitalize ?? 'none'}
        style={{ flex: 1, height: '100%', minWidth: 0, fontFamily: fonts.body, fontSize: 16, color: p.fg }}
      />
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={action.label} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.prs, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={action.icon} size={22} color={p.accent} />
        </Pressable>
      ) : null}
      {secure ? (
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={8} accessibilityLabel={t(show ? 'auth.hide_password' : 'auth.show_password')} style={{ padding: 6 }}>
          <MaterialIcons name={show ? 'visibility-off' : 'visibility'} size={22} color={p.mu} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Bouton principal en dégradé violet (grisé tant que le formulaire n'est pas valide). */
export function AuthButton({ label, onPress, loading, disabled, icon = 'arrow-forward' }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: keyof typeof MaterialIcons.glyphMap }) {
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [{ borderRadius: 18 }, !disabled && styles.glow, pressed && { transform: [{ scale: 0.97 }] }]}>
      <LinearGradient
        colors={disabled ? ['#8E86A8', '#8E86A8'] : ['#8B5CF6', VIOLET_DARK]}
        style={{ height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, letterSpacing: 0.3, color: '#fff' }}>{label}</Text>
        {loading ? null : <MaterialIcons name={icon} size={22} color="#fff" />}
      </LinearGradient>
    </Pressable>
  );
}

/** Pastille d'étape (« ÉTAPE 1 SUR 1 · SÉCURITÉ »). */
export function Chip({ icon, label }: { icon: keyof typeof MaterialIcons.glyphMap; label: string }) {
  const p = useAuthPalette();
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: p.prs, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <MaterialIcons name={icon} size={16} color={p.accent} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5, color: p.accent }}>{label}</Text>
    </View>
  );
}

export function ErrorLine({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
      <MaterialIcons name="error" size={18} color="#EF4444" />
      <Text style={{ flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#EF4444' }}>{text}</Text>
    </View>
  );
}

export function passwordChecks(pw: string) {
  const ok = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  return { ok, count: ok.filter(Boolean).length };
}

/** Jauge de robustesse + quatre règles (8 caractères, majuscule, chiffre, symbole). */
export function PasswordRules({ password }: { password: string }) {
  const p = useAuthPalette();
  const { t } = useTranslation();
  const { ok, count } = passwordChecks(password);
  const color = count < 2 ? '#EF4444' : count < 4 ? '#F59E0B' : '#16A34A';
  const labels = [t('auth.rule_length'), t('auth.rule_upper'), t('auth.rule_digit'), t('auth.rule_symbol')];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < count ? color : p.bd }} />
        ))}
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, marginStart: 6, minWidth: 44, color }}>
          {password ? t(count < 2 ? 'auth.level_weak' : count < 4 ? 'auth.level_medium' : 'auth.level_strong') : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 12 }}>
        {labels.map((l, i) => (
          <View key={l} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name={ok[i] ? 'check-circle' : 'radio-button-unchecked'} size={18} color={ok[i] ? '#16A34A' : p.mu} />
            <Text style={{ flexShrink: 1, fontFamily: ok[i] ? fonts.bodyBold : fonts.body, fontSize: 13, color: ok[i] ? '#16A34A' : p.mu }}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Écran de succès (pastille verte, titre, texte, bouton). */
export function DoneView({ title, text, button, onPress }: { title: string; text: string; button: string; onPress: () => void }) {
  const p = useAuthPalette();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 40, textAlign: 'center' } as never}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', shadowColor: '#16A34A', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
        <MaterialIcons name="check" size={46} color="#fff" />
      </View>
      <Text style={{ fontFamily: fonts.head, fontSize: 28, letterSpacing: -0.8, color: p.fg, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: p.mu, textAlign: 'center' }}>{text}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
        <AuthButton label={button} onPress={onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { shadowColor: VIOLET, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
});
