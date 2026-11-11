import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, KeyboardAvoidingView, Platform, type TextInputProps } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { SubmitButton, type SubmitStatus } from '../SubmitButton';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Banner } from '../ui/Banner';

const LOGO_MARK = require('../../../assets/brand/logo-mark.png');
const LOGO_WORD = require('../../../assets/brand/logo-word.png');

/** Refonte connexion — Design System/MuscleUP Login Redesign.dc.html (variante « néon »). */
export const VIOLET = '#7C3AED';
export const VIOLET_DARK = '#5B21B6';

export function useAuthPalette() {
  const { scheme } = useTheme();
  return scheme === 'dark'
    ? { bg: '#0B0B0F', fg: '#F5F5F7', sf: '#16161D', bd: 'rgba(255,255,255,0.14)', mu: '#A1A1AA', prs: 'rgba(124,58,237,0.2)', accent: '#A78BFA', dark: true }
    : { bg: '#FFFFFF', fg: '#0B0B0F', sf: '#FFFFFF', bd: '#E2DDF0', mu: '#5B5866', prs: '#EFE8FF', accent: VIOLET, dark: false };
}
export type AuthPalette = ReturnType<typeof useAuthPalette>;

/** Hauteur du haut de page (logo + accroche) avant le formulaire, en plus de la zone de la barre d'état. */
const FORM_TOP = 290;

/** Photo d'ambiance : en attendant `athlete.jpg`, rayures violettes sombres comme dans la maquette, puis dégradé vers le noir. */
function Hero({ compact, width, height, insetTop, dark }: { compact?: boolean; width: number; height: number; insetTop: number; dark: boolean }) {
  const { t } = useTranslation();
  const stripes = Array.from({ length: Math.ceil((width + height) / 32) + 1 }, (_, i) => i * 32);
  const shade: [string, string, ...string[]] = compact
    ? ['rgba(11,11,15,0.5)', 'rgba(11,11,15,0.84)']
    : dark
      ? ['rgba(11,11,15,0.4)', 'rgba(11,11,15,0.62)', '#0B0B0F']
      : ['rgba(11,11,15,0.5)', 'rgba(46,22,92,0.78)'];
  const locations = !compact && dark ? ([0, 0.3, 0.64] as const) : undefined;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height, overflow: 'hidden' }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1B1432' }]} />
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
        {stripes.map((x) => (
          <Line key={x} x1={x} y1={0} x2={x - height} y2={height} stroke="#271C44" strokeWidth={16} />
        ))}
      </Svg>
      <LinearGradient colors={shade} locations={locations} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: insetTop + 8, alignItems: 'center' }}>
        <Image source={LOGO_MARK} resizeMode="contain" style={{ width: 132, height: 45 }} accessibilityLabel="Muscle UP" />
        <Image source={LOGO_WORD} resizeMode="contain" style={{ width: 132, height: 12, marginTop: 4 }} />
      </View>
      {compact ? null : (
        <Animated.Text
          entering={FadeInDown.duration(600)}
          style={{ position: 'absolute', left: 24, right: 24, top: insetTop + 96, fontFamily: fonts.display, fontSize: 58, lineHeight: 54, letterSpacing: 0.3, textTransform: 'uppercase', color: '#fff' }}
        >
          {t('auth.login_headline')}
        </Animated.Text>
      )}
    </View>
  );
}

/** Page d'authentification : photo en haut (plein écran pour la connexion, bandeau pour les mots de passe) + formulaire. */
export function AuthScreen({ compact, topLeft, topRight, children }: { compact?: boolean; topLeft?: ReactNode; topRight?: ReactNode; children: ReactNode }) {
  const p = useAuthPalette();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Connexion : photo plein écran. Formulaire sur la photo en sombre, sur une feuille claire en clair.
  const full = !compact;
  const heroH = full ? height : 220 + insets.top * 0.4;
  const top = full ? insets.top + FORM_TOP : heroH - 32;
  const sheet = !full || !p.dark;
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style="light" />
      <Hero compact={compact} width={width} height={heroH} insetTop={insets.top} dark={p.dark} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: top, flexGrow: 1 }}>
          <View
            style={[
              {
                flexGrow: 1,
                minHeight: height - top,
                paddingHorizontal: 24,
                paddingTop: compact ? 22 : 24,
                paddingBottom: Math.max(insets.bottom, 16) + 16,
              },
              sheet && {
                backgroundColor: p.bg,
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                shadowColor: '#1E0A46',
                shadowOpacity: 0.28,
                shadowRadius: 25,
                shadowOffset: { width: 0, height: -18 },
                elevation: 12,
              },
            ]}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Au-dessus du défilement pour rester cliquables (retour). */}
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

interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  icon: keyof typeof MaterialIcons.glyphMap;
  secure?: boolean;
  /** Petit bouton d'action à droite du champ (ex. coller le code). */
  action?: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void };
  borderColor?: string;
  /** Champ en erreur : bordure et icône rouges, secousse à l'apparition, message court dessous. */
  error?: boolean;
  /** Champ valide : bordure et icône vertes, coche à droite. */
  valid?: boolean;
  /** Message sous le champ (rouge en erreur, vert si valide). */
  message?: string;
  /** À incrémenter pour rejouer la secousse d'un champ déjà en erreur (nouvelle tentative). */
  shakeKey?: number;
}

const FIELD_RED = '#EF4444';
const FIELD_GREEN = '#16A34A';

/** Champ arrondi de la refonte : icône, saisie, œil pour les mots de passe — et les états de la maquette
 * « Champs : erreur & validation » (bordure rouge + secousse + message, ou bordure verte + coche). */
export function AuthField({ icon, secure, borderColor, action, error, valid, message, shakeKey, ...input }: AuthFieldProps) {
  const p = useAuthPalette();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);
  const wasError = useRef(false);
  const lastShakeKey = useRef(shakeKey);

  useEffect(() => {
    const triggered = (error && !wasError.current) || (error && shakeKey !== lastShakeKey.current);
    wasError.current = !!error;
    lastShakeKey.current = shakeKey;
    if (!triggered) return;
    // Tremblement discret, juste pour attirer l'œil sur le champ.
    shake.value = withSequence(withTiming(-4, { duration: 70 }), withTiming(3, { duration: 70 }), withTiming(0, { duration: 70 }));
  }, [error, shakeKey, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const accent = error ? FIELD_RED : valid ? FIELD_GREEN : null;
  const messageColor = error ? (p.dark ? '#F87171' : '#DC2626') : p.dark ? '#4ADE80' : '#15803D';
  return (
    <View>
      <Animated.View
        style={[
          { height: 56, borderRadius: 16, backgroundColor: p.sf, borderWidth: 1.5, borderColor: accent ?? (focused ? VIOLET : borderColor ?? p.bd), flexDirection: 'row', alignItems: 'center', gap: 12, paddingStart: 16, paddingEnd: secure || action ? 8 : 16 },
          focused && !accent && { shadowColor: VIOLET, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
          shakeStyle,
        ]}
      >
        <MaterialIcons name={icon} size={22} color={accent ?? p.mu} />
        <TextInput
          {...input}
          onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
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
        ) : !action && (error || valid) ? (
          <MaterialIcons name={error ? 'error' : 'check-circle'} size={22} color={accent ?? p.mu} />
        ) : null}
      </Animated.View>
      {message ? (
        <Animated.Text entering={FadeInDown.duration(180)} style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: messageColor, marginTop: 6, marginStart: 4 }}>
          {message}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/** Bouton principal des écrans d'authentification (voir SubmitButton pour les états : repos, chargement, succès, échec,
 * bloqué). `loading` et `success` restent acceptés pour les écrans qui n'ont que ces deux états. */
export function AuthButton({
  label, onPress, loading, success, status, loadingLabel, errorLabel, lockedLabel, disabled, icon = 'arrow-forward',
}: {
  label: string; onPress: () => void; loading?: boolean; success?: boolean; status?: SubmitStatus;
  loadingLabel?: string; errorLabel?: string; lockedLabel?: string;
  disabled?: boolean; icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <SubmitButton
      label={label}
      loadingLabel={loadingLabel}
      errorLabel={errorLabel}
      lockedLabel={lockedLabel}
      status={status ?? (success ? 'success' : loading ? 'loading' : 'idle')}
      onPress={onPress}
      disabled={disabled}
      icon={icon}
      colors={[VIOLET, VIOLET]}
      glowColor="rgba(124,58,237,0.55)"
      height={60}
      radius={16}
      fontSize={16}
    />
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

/** Bannière de statut des écrans d'authentification — maquette « Erreurs de connexion » : carte à bordure teintée,
 * pastille ronde d'icône, titre et message. Rouge (`danger`) pour une erreur, ambre (`warning`) pour une restriction.
 * Apparition en fondu, rejouée à chaque nouvelle tentative (`attempt`). */
export function AuthErrorBanner({ tone, icon, title, message, attempt = 0 }: {
  tone: 'danger' | 'warning'; icon: keyof typeof MaterialIcons.glyphMap; title: string; message: string; attempt?: number;
}) {
  const p = useAuthPalette();
  const c = tone === 'danger' ? '#EF4444' : '#F59E0B';
  return (
    <Animated.View
      key={attempt}
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(140)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: p.sf, borderWidth: 1, borderColor: `${c}66` }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${c}26`, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={icon} size={22} color={c} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: p.fg }}>{title}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: p.mu, marginTop: 2 }}>{message}</Text>
      </View>
    </Animated.View>
  );
}

export function ErrorLine({ text }: { text: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Banner tone="danger" icon="error-outline" text={text} />
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
