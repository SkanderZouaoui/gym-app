import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { ScanResultOverlay } from './ScanResultOverlay';
import { ScreenTitle } from './ui';
import { InitialsAvatar } from './staff/staffUi';
import { useMembers } from '../hooks/useStaff';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useManualCheckin, useScan, type ScanOutcome } from '../hooks/useAttendance';

export interface ScanSessionOption {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

interface ScannerProps {
  sessionId: string;
  /** Cours proposés dans le sélecteur « Cours en cours » ; masqué s'il n'y en a qu'un. */
  sessions?: ScanSessionOption[];
  onSelectSession?: (id: string) => void;
}

const FRAME = 206;
const ACCENT = '#A78BFA';

/** Écran de scan v2 : titre, viseur avec cadre à coins lumineux et ligne de balayage animée,
 * sélecteur de cours, pointage manuel par code de réservation. */
export function Scanner({ sessionId, sessions, onSelectSession }: ScannerProps) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [code, setCode] = useState('');
  const [manualTab, setManualTab] = useState<'code' | 'name'>('code');
  const [nameQuery, setNameQuery] = useState('');
  const locked = useRef(false);

  const scan = useScan();
  const manualCheckin = useManualCheckin();
  const { data: found } = useMembers(nameQuery.trim());

  // Ligne de balayage : va-et-vient vertical dans le cadre.
  const line = useSharedValue(0);
  useEffect(() => {
    line.value = withRepeat(withTiming(FRAME - 3, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [line]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: line.value }] }));

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (locked.current) return;
    locked.current = true;
    scan.mutate(
      { token: data, sessionId },
      {
        onSuccess: (res) => {
          void Haptics.notificationAsync(
            res.result === 'GRANTED' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
          );
          setOutcome(res);
        },
        onError: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setOutcome({ result: 'DENIED', reasonCode: 'TOKEN_INVALID' });
        },
      },
    );
  };

  const dismissOutcome = () => {
    setOutcome(null);
    setTimeout(() => {
      locked.current = false;
    }, 300);
  };

  const submitManualCode = () => {
    manualCheckin.mutate(
      { sessionId, memberCode: code },
      {
        onSuccess: (res) => {
          setOutcome(res);
          setCode('');
        },
      },
    );
  };

  const checkInMember = (userId: string) => {
    manualCheckin.mutate(
      { sessionId, userId },
      {
        onSuccess: (res) => {
          setOutcome(res);
          setNameQuery('');
        },
      },
    );
  };

  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const corner = (pos: 'tl' | 'tr' | 'bl' | 'br') => {
    const base = { position: 'absolute' as const, width: 44, height: 44, borderColor: ACCENT, borderWidth: 4 };
    const map = {
      tl: { left: 0, top: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 22 },
      tr: { right: 0, top: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 22 },
      bl: { left: 0, bottom: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 22 },
      br: { right: 0, bottom: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 22 },
    }[pos];
    return <View key={pos} style={[base, map, styles.cornerGlow]} />;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenTitle
          title={manualMode ? 'Pointage manuel' : 'Scanner'}
          subtitle={manualMode ? 'Code à 6 chiffres de l’adhérent, ou recherche par nom.' : 'Valider la présence aux cours collectifs.'}
        />

        {manualMode ? (
          <View style={{ gap: 12 }}>
            <View style={styles.tabs}>
              {([
                { value: 'code', label: 'Code à 6 chiffres', icon: 'pin' },
                { value: 'name', label: 'Recherche par nom', icon: 'search' },
              ] as const).map((t) => {
                const active = manualTab === t.value;
                return (
                  <Pressable key={t.value} style={[styles.tab, active && styles.tabActive]} onPress={() => setManualTab(t.value)}>
                    <MaterialIcons name={t.icon} size={18} color={active ? colors.primaryContrast : colors.muted} />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {manualTab === 'code' ? (
              <View style={[styles.manualCard, cardShadow]}>
                <View style={styles.codeRow}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={[styles.codeBox, i === code.length && styles.codeBoxActive, code[i] && styles.codeBoxFilled]}>
                      <Text style={styles.codeBoxText}>{code[i] ?? ''}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.keypad}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <Pressable
                      key={k}
                      style={({ pressed }) => [styles.key, pressed && { transform: [{ scale: 0.94 }] }]}
                      onPress={() => {
                        if (k === '⌫') setCode((c) => c.slice(0, -1));
                        else if (k === 'C') setCode('');
                        else if (code.length < 6) setCode((c) => c + k);
                      }}
                    >
                      {k === '⌫' ? (
                        <MaterialIcons name="backspace" size={22} color={colors.text} />
                      ) : (
                        <Text style={[styles.keyText, k === 'C' && { color: colors.muted }]}>{k}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={styles.searchBox}>
                  <MaterialIcons name="search" size={22} color={colors.muted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Nom ou prénom de l’adhérent…"
                    placeholderTextColor={colors.muted}
                    value={nameQuery}
                    onChangeText={setNameQuery}
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>
                {nameQuery.trim().length < 2 ? (
                  <Text style={styles.hint}>Saisissez au moins 2 lettres pour chercher.</Text>
                ) : (found ?? []).length === 0 ? (
                  <Text style={styles.hint}>Aucun adhérent trouvé.</Text>
                ) : (
                  (found ?? []).slice(0, 8).map((m) => (
                    <Pressable
                      key={m.id}
                      style={({ pressed }) => [styles.memberRow, cardShadow, pressed && { transform: [{ scale: 0.98 }] }]}
                      onPress={() => checkInMember(m.id)}
                      disabled={manualCheckin.isPending}
                    >
                      <InitialsAvatar first={m.firstName} last={m.lastName} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.memberName} numberOfLines={1}>{m.firstName} {m.lastName}</Text>
                        <Text style={styles.memberMeta} numberOfLines={1}>{m.memberships?.[0]?.plan.name ?? 'Aucun abonnement'}</Text>
                      </View>
                      <View style={styles.checkPill}>
                        <MaterialIcons name="how-to-reg" size={18} color={colors.primaryInk} />
                        <Text style={styles.checkPillText}>Pointer</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.viewfinderShadow}>
            <View style={styles.viewfinder}>
              {permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={torch}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={outcome ? undefined : handleBarcodeScanned}
                />
              ) : null}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: permission?.granted ? 'rgba(20,10,48,0.45)' : '#120A2A' }]} />

              {permission && !permission.granted ? (
                <View style={styles.permission}>
                  <MaterialIcons name="photo-camera" size={40} color={ACCENT} />
                  <Text style={styles.permissionText}>L’accès à la caméra est nécessaire pour scanner les QR de présence.</Text>
                  <Pressable style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.frame}>
                    {(['tl', 'tr', 'bl', 'br'] as const).map(corner)}
                    <Animated.View style={[styles.scanLine, lineStyle]}>
                      <LinearGradient
                        colors={['transparent', '#C4B5FD', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  </View>
                  <Pressable style={styles.torch} onPress={() => setTorch((t) => !t)} accessibilityLabel="Lampe">
                    <MaterialIcons name={torch ? 'flash-on' : 'flash-off'} size={22} color="#FFFFFF" />
                  </Pressable>
                  <View style={styles.captionWrap}>
                    <Text style={styles.caption}>Placez le QR de l’adhérent dans le cadre</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {!manualMode && sessions && sessions.length > 0 ? (
          <View>
            <Text style={styles.label}>Cours en cours et à venir</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {sessions.map((s) => {
                const active = s.id === sessionId;
                const live = new Date(s.startsAt).getTime() <= Date.now();
                return (
                  <Pressable key={s.id} onPress={() => onSelectSession?.(s.id)} style={({ pressed }) => [styles.sessionCard, active && styles.sessionCardActive, pressed && { opacity: 0.9 }]}>
                    {active ? (
                      <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    ) : null}
                    <View style={styles.sessionTop}>
                      <View style={[styles.liveDot, { backgroundColor: live ? '#34D399' : active ? 'rgba(255,255,255,0.6)' : colors.muted }]} />
                      <Text style={[styles.sessionState, active && { color: 'rgba(255,255,255,0.9)' }]}>{live ? 'EN COURS' : 'À VENIR'}</Text>
                    </View>
                    <Text style={[styles.sessionName, active && { color: '#FFFFFF' }]} numberOfLines={1}>{s.name}</Text>
                    <Text style={[styles.sessionTime, active && { color: 'rgba(255,255,255,0.9)' }]}>{timeOf(s.startsAt)} – {timeOf(s.endsAt)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {manualMode ? (
          <View style={{ gap: 10 }}>
            {manualTab === 'code' ? (
            <Pressable
              onPress={submitManualCode}
              disabled={code.length !== 6 || manualCheckin.isPending}
              style={({ pressed }) => [styles.ctaShadow, pressed && { transform: [{ scale: 0.98 }] }, (code.length !== 6 || manualCheckin.isPending) && { opacity: 0.5 }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <MaterialIcons name="check" size={24} color={colors.primaryContrast} />
                <Text style={styles.ctaText}>{manualCheckin.isPending ? 'Validation…' : 'Valider la présence'}</Text>
              </LinearGradient>
            </Pressable>
            ) : null}
            <Pressable style={styles.secondary} onPress={() => setManualMode(false)}>
              <MaterialIcons name="qr-code-scanner" size={22} color={colors.text} />
              <Text style={styles.secondaryText}>Revenir au scan</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={({ pressed }) => [styles.secondary, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => setManualMode(true)}>
            <MaterialIcons name="keyboard" size={22} color={colors.text} />
            <Text style={styles.secondaryText}>Pointage manuel</Text>
          </Pressable>
        )}
      </ScrollView>

      {outcome ? <ScanResultOverlay outcome={outcome} onDismiss={dismissOutcome} onManual={manualMode ? undefined : () => setManualMode(true)} /> : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 140 },
    viewfinderShadow: {
      borderRadius: 32, shadowColor: colors.primary, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 22, elevation: 10,
    },
    viewfinder: { height: 330, borderRadius: 32, overflow: 'hidden', backgroundColor: '#07060D', alignItems: 'center', justifyContent: 'center' },
    frame: { width: FRAME, height: FRAME, borderRadius: 22, backgroundColor: 'rgba(167,139,250,0.06)' },
    cornerGlow: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 },
    scanLine: {
      position: 'absolute', left: 10, right: 10, top: 0, height: 3, borderRadius: 2, overflow: 'hidden',
      shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14,
    },
    torch: {
      position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center',
    },
    captionWrap: { position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' },
    caption: {
      fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.16)',
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden',
    },
    permission: { alignItems: 'center', gap: 12, paddingHorizontal: 28 },
    permissionText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#FFFFFF', textAlign: 'center' },
    permissionButton: { height: 44, paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    permissionButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginBottom: 8 },
    chips: { gap: 10 },
    sessionCard: {
      width: 170, padding: 14, gap: 4, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    sessionCardActive: { borderColor: colors.primary },
    sessionTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    sessionState: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.muted },
    sessionName: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text, marginTop: 2 },
    sessionTime: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
    tabs: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 18, padding: 4, gap: 4 },
    tab: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
    tabTextActive: { color: colors.primaryContrast },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 16, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, height: 52 },
    hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 12 },
    memberRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface,
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    },
    memberName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    memberMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    checkPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft },
    checkPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    secondary: {
      minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    secondaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    manualCard: { padding: 18, gap: 18, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    codeRow: { flexDirection: 'row', gap: 8 },
    codeBox: {
      width: 46, height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
      alignItems: 'center', justifyContent: 'center',
    },
    codeBoxActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    codeBoxFilled: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
    codeBoxText: { fontFamily: fonts.head, fontSize: 22, color: colors.text },
    keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 320 },
    key: { width: 58, height: 52, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    keyText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
  });
}
