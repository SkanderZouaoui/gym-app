import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../src/theme/tokens';
import { useTheme } from '../src/theme/ThemeContext';
import { Banner } from '../src/components/ui';
import { meApi } from '../src/api/endpoints';
import { useLanguage } from '../src/i18n/LanguageContext';
import { useSessionStore } from '../src/store/session';
import { onboardingSkipped } from '../src/store/onboardingSkip';

type Icon = keyof typeof MaterialIcons.glyphMap;

const GOALS: { key: string; icon: Icon }[] = [
  { key: 'lose_weight', icon: 'monitor-weight' },
  { key: 'build_muscle', icon: 'fitness-center' },
  { key: 'stay_fit', icon: 'favorite' },
  { key: 'relax', icon: 'self-improvement' },
];
const GENDERS = ['female', 'male'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const FREQS = ['1-2', '3-4', '5+'];
const STEPS = 4;

/** Onboarding adhérent — Design System/FitZone Onboarding.dc.html : réserver, entrer, objectif, profil physique. */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('stay_fit');
  const [gender, setGender] = useState('female');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState(30);
  const [level, setLevel] = useState('beginner');
  const [freq, setFreq] = useState('3-4');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useSessionStore((s) => s.user);
  const roles = useSessionStore((s) => s.roles);
  const setSession = useSessionStore((s) => s.setSession);

  const leave = () => router.replace('/(member)/(tabs)' as any);
  const skip = () => {
    onboardingSkipped.value = true;
    leave();
  };
  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      const me = await meApi.completeOnboarding({ goal, gender, heightCm: height, weightKg: weight, age, level, sessionsPerWeek: freq });
      setSession({ ...(user ?? me), ...me }, roles, 'MEMBER');
      leave();
    } catch {
      setError(t('onboarding.save_error'));
    } finally {
      setSaving(false);
    }
  };
  const { isRtl } = useLanguage();

  // Balayage horizontal : le contenu suit le doigt, puis glisse vers l'écran suivant / précédent (inversé en arabe).
  // Le dernier écran se valide avec le bouton.
  const { width } = useWindowDimensions();
  const x = useState(() => new Animated.Value(0))[0];
  const live = useRef({ step, isRtl, width, busy: false });
  useEffect(() => {
    live.current = { ...live.current, step, isRtl, width };
  });
  const goTo = (target: number, dir: 1 | -1) => {
    const w = live.current.width;
    live.current.busy = true;
    Animated.timing(x, { toValue: -dir * w, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setStep(target);
      x.setValue(dir * w * 0.35);
      Animated.spring(x, { toValue: 0, damping: 20, stiffness: 220, mass: 0.8, useNativeDriver: true }).start(() => {
        live.current.busy = false;
      });
    });
  };
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !live.current.busy && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const { step: cur, isRtl: rtl } = live.current;
        const forward = rtl ? g.dx > 0 : g.dx < 0;
        const blocked = forward ? cur >= STEPS - 1 : cur <= 0;
        x.setValue(blocked ? g.dx * 0.2 : g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const { step: cur, isRtl: rtl, width: w } = live.current;
        const forward = rtl ? g.dx > 0 : g.dx < 0;
        const target = forward ? cur + 1 : cur - 1;
        const far = Math.abs(g.dx) > w * 0.25 || Math.abs(g.vx) > 0.5;
        if (far && target >= 0 && target < STEPS) goTo(target, forward ? 1 : -1);
        else Animated.spring(x, { toValue: 0, damping: 18, stiffness: 240, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );
  const opacity = x.interpolate({ inputRange: [-width, 0, width], outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' });

  const next = () => (step < STEPS - 1 ? (!live.current.busy && goTo(step + 1, 1)) : void finish());

  const chips = (values: string[], current: string, set: (v: string) => void, prefix: string) => (
    <View style={styles.chipRow}>
      {values.map((v) => {
        const on = v === current;
        return (
          <Pressable key={v} onPress={() => set(v)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.chip, on && styles.chipOn]}>
            {on ? <MaterialIcons name="check" size={18} color={colors.primaryInk} /> : null}
            <Text style={[styles.chipText, on && { color: colors.primaryInk }]} numberOfLines={1}>{prefix ? t(`${prefix}_${v}`) : v.replace('-', '–')}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  const dots = (
    <View style={styles.dots}>
      {Array.from({ length: STEPS }, (_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
      ))}
    </View>
  );
  const heading = (title: string, text: string) => (
    <View style={styles.copy}>
      {dots}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.top}>
        <Pressable onPress={skip} hitSlop={8} style={styles.skipBtn}>
          <Text style={styles.skip}>{t('onboarding.skip')}</Text>
        </Pressable>
      </View>

      <Animated.View style={{ flex: 1, opacity, transform: [{ translateX: x }] }} {...pan.panHandlers}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        {step === 0 ? (
          <>
            <View style={[styles.illus, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.circleTopEnd, { backgroundColor: colors.primary }]} />
              <View style={[styles.ghostCard, { left: 44, right: 44, top: 36, opacity: 0.55 }]} />
              <View style={[styles.ghostCard, { left: 32, right: 32, top: 60, opacity: 0.8 }]} />
              <View style={styles.classCard}>
                <View style={styles.classRow}>
                  <View style={styles.classIcon}>
                    <MaterialIcons name="local-fire-department" size={28} color={colors.primaryInk} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.className} numberOfLines={1}>{t('onboarding.demo_class')}</Text>
                    <Text style={styles.classMeta} numberOfLines={1}>{t('onboarding.demo_meta')}</Text>
                  </View>
                  <View style={styles.spots}>
                    <Text style={styles.spotsText}>{t('onboarding.demo_spots')}</Text>
                  </View>
                </View>
                <View style={styles.track}>
                  <View style={styles.trackFill} />
                </View>
                <View style={styles.demoBtn}>
                  <MaterialIcons name="event-available" size={20} color={colors.primaryContrast} />
                  <Text style={styles.demoBtnText}>{t('onboarding.demo_book')}</Text>
                </View>
              </View>
              <View style={styles.touchPill}>
                <MaterialIcons name="touch-app" size={18} color={colors.onSecondary} />
                <Text style={styles.touchPillText}>{t('onboarding.book_pill')}</Text>
              </View>
            </View>
            {heading(t('onboarding.book_title'), t('onboarding.book_text'))}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <View style={[styles.illus, { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', gap: 18 }]}>
              <View style={[styles.circleBottomStart, { backgroundColor: colors.primary }]} />
              <View style={styles.qrTile}>
                <MaterialIcons name="qr-code-2" size={140} color={colors.primaryContrast} />
              </View>
              <View style={styles.pillRow}>
                <View style={styles.whitePill}>
                  <MaterialIcons name="autorenew" size={17} color={colors.successInk} />
                  <Text style={styles.whitePillText}>{t('onboarding.enter_renew')}</Text>
                </View>
                <View style={styles.whitePill}>
                  <MaterialIcons name="wifi-off" size={17} color={colors.primaryInk} />
                  <Text style={styles.whitePillText}>{t('onboarding.enter_pill')}</Text>
                </View>
              </View>
            </View>
            {heading(t('onboarding.enter_title'), t('onboarding.enter_text'))}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={styles.goalGrid}>
              {GOALS.map((g) => {
                const on = g.key === goal;
                return (
                  <Pressable key={g.key} onPress={() => setGoal(g.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.goal, on && styles.goalOn]}>
                    <View style={[styles.goalIcon, on && { backgroundColor: colors.primary }]}>
                      <MaterialIcons name={g.icon} size={26} color={on ? colors.primaryContrast : colors.text} />
                    </View>
                    <Text style={styles.goalLabel}>{t(`onboarding.goal_${g.key}`)}</Text>
                    <View style={[styles.radio, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      {on ? <MaterialIcons name="check" size={18} color={colors.primaryContrast} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {heading(t('onboarding.goal_title'), t('onboarding.goal_text'))}
          </>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: 16 }}>
            {heading(t('onboarding.profile_title'), t('onboarding.profile_text'))}
            <View>
              <Text style={styles.label}>{t('onboarding.gender')}</Text>
              {chips(GENDERS, gender, setGender, 'onboarding.gender')}
            </View>
            <View style={styles.stepperRow}>
              <NumberStepper label={t('onboarding.height')} unit="cm" value={height} onChange={setHeight} min={100} max={250} />
              <NumberStepper label={t('onboarding.weight')} unit="kg" value={weight} onChange={setWeight} min={30} max={250} />
              <NumberStepper label={t('onboarding.age')} unit={t('onboarding.years')} value={age} onChange={setAge} min={10} max={100} />
            </View>
            <View>
              <Text style={styles.label}>{t('onboarding.level')}</Text>
              {chips(LEVELS, level, setLevel, 'onboarding.level')}
            </View>
            <View>
              <Text style={styles.label}>{t('onboarding.frequency')}</Text>
              {chips(FREQS, freq, setFreq, '')}
            </View>
            {error ? <Banner tone="danger" icon="error" text={error} /> : null}
          </View>
        ) : null}
      </ScrollView>
      </Animated.View>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable onPress={() => !live.current.busy && goTo(step - 1, -1)} style={styles.backBtn} accessibilityLabel={t('onboarding.back')}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primaryInk} style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined} />
          </Pressable>
        ) : null}
        <Pressable onPress={next} disabled={saving} style={({ pressed }) => [styles.cta, { flex: 1 }, pressed && { backgroundColor: colors.primaryPressed }, saving && { opacity: 0.6 }]}>
          <Text style={styles.ctaText}>{t(step === STEPS - 1 ? 'onboarding.start' : 'onboarding.next')}</Text>
          <MaterialIcons name="arrow-forward" size={20} color={colors.primaryContrast} />
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Valeur numérique modifiable avec − / + ou directement au clavier (bornée à la fin de la saisie). */
function NumberStepper({ label, unit, value, onChange, min, max }: { label: string; unit: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : String(value);
  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    const clamped = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : value;
    onChange(clamped);
    setText(String(clamped));
  };
  const step = (d: number) => {
    const next = Math.max(min, Math.min(max, value + d));
    onChange(next);
    setText(String(next));
  };
  return (
    <View style={styles.stepperCard}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepValueRow}>
        <TextInput
          value={shown}
          onFocus={() => { setText(String(value)); setFocused(true); }}
          onChangeText={(v) => {
            const digits = v.replace(/[^0-9]/g, '').slice(0, 3);
            setText(digits);
            const n = parseInt(digits, 10);
            if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => { setFocused(false); commit(text); }}
          onSubmitEditing={() => commit(text)}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={3}
          accessibilityLabel={label}
          style={styles.stepInput}
        />
        <Text style={styles.stepUnit}>{unit}</Text>
      </View>
      <View style={styles.stepBtns}>
        <Pressable style={styles.stepMinus} onPress={() => step(-1)} accessibilityLabel={label}>
          <MaterialIcons name="remove" size={22} color={colors.text} />
        </Pressable>
        <Pressable style={styles.stepPlus} onPress={() => step(1)} accessibilityLabel={label}>
          <MaterialIcons name="add" size={22} color={colors.primaryInk} />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 4 },
    skipBtn: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
    skip: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.muted },
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, flexGrow: 1 },
    illus: { minHeight: 340, flex: 1, maxHeight: 400, borderRadius: radii.xl ?? radii.lg, overflow: 'hidden' },
    circleTopEnd: { position: 'absolute', top: -60, end: -50, width: 220, height: 220, borderRadius: 110, opacity: 0.14 },
    circleBottomStart: { position: 'absolute', bottom: -70, start: -50, width: 240, height: 240, borderRadius: 120, opacity: 0.18 },
    ghostCard: { position: 'absolute', height: 120, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    classCard: { position: 'absolute', left: 20, right: 20, top: 90, padding: 16, gap: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    classRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    classIcon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    className: { fontFamily: fonts.headBold, fontSize: 17, color: colors.text },
    classMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    spots: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: colors.successSoft },
    spotsText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.successInk },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
    trackFill: { width: '80%', height: '100%', borderRadius: 3, backgroundColor: colors.primary },
    demoBtn: { height: 44, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary },
    demoBtnText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.primaryContrast },
    touchPill: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.secondary },
    touchPillText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onSecondary },
    qrTile: { width: 200, height: 200, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 12 },
    whitePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: colors.surface },
    whitePillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    copy: { paddingHorizontal: 4, paddingTop: 24, gap: 10 },
    dots: { flexDirection: 'row', gap: 6 },
    dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
    dotOn: { width: 24, backgroundColor: colors.primary },
    title: { marginTop: 6, fontFamily: fonts.head, fontSize: 28, lineHeight: 31, letterSpacing: -0.8, color: colors.text, textAlign: 'left' },
    text: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22, color: colors.muted, textAlign: 'left' },
    goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    goal: { width: '47.8%', flexGrow: 1, height: 188, padding: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'space-between', alignItems: 'flex-start' },
    goalOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
    goalIcon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    goalLabel: { fontFamily: fonts.headBold, fontSize: 16, lineHeight: 19, color: colors.text },
    radio: { position: 'absolute', top: 14, end: 14, width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
    chipOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    stepperRow: { flexDirection: 'row', gap: 10 },
    stepperCard: { flex: 1, minWidth: 0, padding: 12, gap: 8, alignItems: 'center', borderRadius: radii.md ?? radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    stepLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.muted },
    stepValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    stepInput: { minWidth: 44, paddingVertical: 0, paddingHorizontal: 0, textAlign: 'center', fontFamily: fonts.head, fontSize: 30, letterSpacing: -0.9, color: colors.text },
    stepValue: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -0.9, color: colors.text },
    stepUnit: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
    stepBtns: { flexDirection: 'row', gap: 8 },
    stepMinus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
    stepPlus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
    backBtn: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    cta: { height: 48, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
  });
}
