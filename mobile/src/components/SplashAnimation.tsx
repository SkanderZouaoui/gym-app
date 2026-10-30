import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Line, Polyline, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import i18n from '../i18n';

/**
 * Splash animé « Le mouvement » — Design System/FitZone Splash v2.dc.html.
 * Un point suit la trajectoire du muscle-up (traction, transition, poussée), passe au-dessus de la barre,
 * puis le nom se révèle. Repère de 390×844, mis à l'échelle de l'écran.
 */
const W = 390;
const H = 844;
const DURATION = 2200;
const START_DELAY = 300;
const P: [number, number][] = [[200, 740], [200, 540], [135, 440], [200, 285]];

const bezier = (t: number): [number, number] => {
  const u = 1 - t;
  const f = (i: 0 | 1) => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i];
  return [f(0), f(1)];
};
const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** Apparition / disparition douce d'un élément. */
function Fade({ visible, duration = 350, style, children }: { visible: boolean; duration?: number; style?: object; children?: React.ReactNode }) {
  const v = useState(() => new Animated.Value(visible ? 1 : 0))[0];
  useEffect(() => {
    Animated.timing(v, { toValue: visible ? 1 : 0, duration, useNativeDriver: true }).start();
  }, [visible, duration, v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

export function SplashAnimation({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const dark = useColorScheme() === 'dark';
  const [p, setP] = useState(0);
  const [ph, setPh] = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const out = useState(() => new Animated.Value(1))[0];
  const muscleX = useState(() => new Animated.Value(-16))[0];
  const barScale = useState(() => new Animated.Value(0))[0];
  const upY = useState(() => new Animated.Value(150))[0];
  const fill = useState(() => new Animated.Value(0))[0];
  const fillWidth = fill.interpolate({ inputRange: [0, 1], outputRange: [0, 140] });

  useEffect(() => {
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t0 = Date.now() + START_DELAY;
    const step = () => {
      const k = Math.min(1, Math.max(0, (Date.now() - t0) / DURATION));
      setP(easeInOut(k));
      if (k < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      setPh(1);
      [[450, 2], [880, 3], [1250, 4], [1650, 5]].forEach(([ms, q]) => timers.push(setTimeout(() => setPh(q), ms)));
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (ph >= 2) Animated.timing(muscleX, { toValue: 0, duration: 550, useNativeDriver: true }).start();
    if (ph >= 3) Animated.timing(barScale, { toValue: 1, duration: 550, easing: Easing.bezier(0.7, 0, 0.2, 1), useNativeDriver: true }).start();
    if (ph >= 4) Animated.timing(upY, { toValue: 0, duration: 650, easing: Easing.bezier(0.2, 0.9, 0.25, 1.1), useNativeDriver: true }).start();
    if (ph >= 5) {
      Animated.timing(fill, { toValue: 1, duration: 1500, easing: Easing.bezier(0.5, 0, 0.2, 1), useNativeDriver: false }).start(() => setAnimDone(true));
    }
  }, [ph, muscleX, barScale, upY, fill]);

  // L'animation se termine toujours ; le splash ne part qu'une fois l'app prête (polices, session).
  useEffect(() => {
    if (!animDone || !ready) return;
    Animated.timing(out, { toValue: 0, duration: 300, useNativeDriver: true }).start(onFinish);
  }, [animDone, ready, out, onFinish]);

  const s = Math.min(width / W, height / H);
  const ox = (width - W) / 2;
  const oy = (height - H) / 2;
  const extra = width / s; // largeur de la barre en repère 390
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    if (t > p) break;
    pts.push(bezier(t).map(Math.round).join(','));
  }
  const [dx, dy] = bezier(p);
  const labels: [number, string, string][] = [
    [0.04, '1', i18n.t('splash.traction')],
    [0.5, '2', i18n.t('splash.transition')],
    [0.9, '3', i18n.t('splash.push')],
  ];
  const dot = ph >= 1 ? 40 : 10;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: out, zIndex: 100 }]}>
      {dark ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0F0B1E' }]} /> : (
        <LinearGradient colors={['#8B5CF6', '#6D28D9', '#2E1065']} locations={[0, 0.45, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {Array.from({ length: Math.ceil((width + height) / 26) + 1 }, (_, i) => (
          <Line key={i} x1={i * 26} y1={0} x2={i * 26 - height * 0.47} y2={height} stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', left: ox, top: oy, width: W, height: H, transform: [{ scale: s }] }}>
        <Fade visible={ph >= 4} duration={1000} style={{ position: 'absolute', left: W / 2 - 320, top: 420 - 320, width: 640, height: 640, opacity: 0.35 }}>
          <Svg width={640} height={640}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={dark ? '#7C3AED' : '#C4B5FD'} stopOpacity={dark ? 0.45 : 0.35} />
                <Stop offset="0.65" stopColor={dark ? '#7C3AED' : '#C4B5FD'} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={320} cy={320} r={320} fill="url(#glow)" />
          </Svg>
        </Fade>

        <Animated.View style={{ position: 'absolute', left: 0, top: 262, width: W, height: 90, alignItems: 'center', opacity: ph >= 2 ? 1 : 0, transform: [{ translateX: muscleX }] }}>
          <Svg width={W} height={90}>
            <SvgText x={W / 2} y={66} fontSize={68} fontWeight="900" fontStyle="italic" fill="none" stroke="#fff" strokeWidth={2} textAnchor="middle">MUSCLE</SvgText>
          </Svg>
        </Animated.View>

        {/* Barre de traction pleine largeur, puis barre arrondie qui se déploie. */}
        <Fade visible={ph < 1} duration={400} style={{ position: 'absolute', left: -(extra - W) / 2, width: extra, top: 340, height: 12, backgroundColor: '#fff', shadowColor: '#C4B5FD', shadowOpacity: 0.8, shadowRadius: 9 }} />
        <Animated.View style={{ position: 'absolute', left: 20, width: 350, top: 340, height: 12, borderRadius: 6, backgroundColor: '#fff', shadowColor: '#C4B5FD', shadowOpacity: 0.7, shadowRadius: 15, transform: [{ translateX: -175 }, { scaleX: barScale }, { translateX: 175 }] }} />

        <View style={{ position: 'absolute', left: 0, top: 362, width: W, height: 130, overflow: 'hidden', alignItems: 'center' }}>
          <Animated.View style={{ transform: [{ translateY: upY }] }}>
            {/* En SVG : l'italique déborde à droite de la boîte du texte et serait rogné par un Text natif. */}
            <Svg width={W} height={130} viewBox={`0 0 ${W} 130`}>
              <SvgText x={W / 2} y={122} fontSize={150} fontWeight="900" fontStyle="italic" letterSpacing={-9} fill="#fff" textAnchor="middle">UP</SvgText>
            </Svg>
          </Animated.View>
        </View>

        <Fade visible={ph >= 5} duration={500} style={{ position: 'absolute', left: 0, width: W, top: 510, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.9)' }}>{i18n.t('splash.tagline')}</Text>
        </Fade>

        <Fade visible={ph >= 5} duration={400} style={{ position: 'absolute', left: 0, width: W, bottom: 90, alignItems: 'center', gap: 12 }}>
          <View style={{ width: 140, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
            <Animated.View style={{ height: '100%', borderRadius: 2, backgroundColor: '#fff', width: fillWidth }} />
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.7, color: 'rgba(255,255,255,0.75)' }}>{i18n.t('splash.loading')}</Text>
        </Fade>

        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Polyline points={pts.join(' ')} fill="none" stroke="#DDD6FE" strokeWidth={3.5} strokeDasharray="2 9" strokeLinecap="round" opacity={ph >= 1 ? 0 : 1} />
          {p > 0 && ph < 1 ? (
            <>
              <Circle cx={dx} cy={dy} r={dot * 2.2} fill="#C4B5FD" opacity={0.25} />
              <Circle cx={dx} cy={dy} r={dot} fill="#fff" />
            </>
          ) : null}
        </Svg>

        {labels.map(([t, n, label]) => {
          const [x, y] = bezier(t);
          return (
            <Fade key={n} visible={ph < 1 && p >= t} style={{ position: 'absolute', left: Math.round(x) + 34, top: Math.round(y) - 11, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#5B21B6' }}>{n}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#fff' }}>{label}</Text>
            </Fade>
          );
        })}
      </View>
    </Animated.View>
  );
}
