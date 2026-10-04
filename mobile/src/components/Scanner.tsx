import { useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { ScanResultOverlay } from './ScanResultOverlay';
import { colors, fonts, radii, spacing } from '../theme/tokens';
import { useManualCheckin, useScan, type ScanOutcome } from '../hooks/useAttendance';

interface ScannerProps {
  sessionId: string;
  onClose?: () => void;
}

export function Scanner({ sessionId }: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [code, setCode] = useState('');
  const locked = useRef(false);

  const scan = useScan();
  const manualCheckin = useManualCheckin();

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (locked.current) return;
    locked.current = true;

    scan.mutate(
      { token: data, sessionId },
      {
        onSuccess: (res) => {
          Haptics.notificationAsync(
            res.result === 'GRANTED'
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Error,
          );
          setOutcome(res);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      { sessionId, bookingCode: code.trim().toUpperCase() },
      {
        onSuccess: (res) => {
          setOutcome(res);
          setCode('');
        },
      },
    );
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="qr-code-scanner" size={48} color={colors.muted} />
        <Text style={styles.permissionText}>
          L'accès à la caméra est nécessaire pour scanner les QR de présence
        </Text>
        <Button label="Autoriser la caméra" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {manualMode ? (
        <View style={styles.manualContainer}>
          <Text style={styles.manualTitle}>Code de réservation</Text>
          <Text style={styles.manualSubtitle}>Saisis le code à 6 caractères de l'adhérent</Text>
          <View style={styles.codeInputRow}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.codeBox}>
                <Text style={styles.codeBoxText}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </View>
          <KeypadInput value={code} onChange={setCode} maxLength={6} />
          <Button
            label="Valider"
            onPress={submitManualCode}
            disabled={code.length !== 6}
            loading={manualCheckin.isPending}
          />
          <Pressable onPress={() => setManualMode(false)} style={{ marginTop: spacing.md }}>
            <Text style={styles.linkText}>Revenir au scan</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={outcome ? undefined : handleBarcodeScanned}
          />
          <View style={styles.frameOverlay}>
            <View style={styles.frame} />
          </View>
          <View style={styles.topBar}>
            <Pressable style={styles.iconButton} onPress={() => setTorch((t) => !t)}>
              <MaterialIcons name={torch ? 'flash-on' : 'flash-off'} size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.bottomBar}>
            <Pressable style={styles.manualButton} onPress={() => setManualMode(true)}>
              <Text style={styles.manualButtonText}>Saisir un code manuellement</Text>
            </Pressable>
          </View>
        </>
      )}

      {outcome ? <ScanResultOverlay outcome={outcome} onDismiss={dismissOutcome} /> : null}
    </View>
  );
}

function KeypadInput({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
}) {
  const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫'];
  return (
    <View style={styles.keypad}>
      {keys.map((k) => (
        <Pressable
          key={k}
          style={styles.key}
          onPress={() => {
            if (k === '⌫') onChange(value.slice(0, -1));
            else if (value.length < maxLength) onChange(value + k);
          }}
        >
          <Text style={styles.keyText}>{k}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  permissionText: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center' },
  frameOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: radii.lg, borderWidth: 3, borderColor: '#fff' },
  topBar: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: { position: 'absolute', bottom: spacing.xl, left: 0, right: 0, alignItems: 'center' },
  manualButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.sm,
  },
  manualButtonText: { fontFamily: fonts.bodyBold, color: '#fff', fontSize: 13.5 },
  manualContainer: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, alignItems: 'center', gap: spacing.md, paddingTop: 60 },
  manualTitle: { fontFamily: fonts.head, fontSize: 22, color: colors.secondary },
  manualSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  codeInputRow: { flexDirection: 'row', gap: 8, marginVertical: spacing.md },
  codeBox: {
    width: 40,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  codeBoxText: { fontFamily: fonts.headBold, fontSize: 18, color: colors.text },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 280 },
  key: {
    width: 56,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  linkText: { fontFamily: fonts.bodyBold, color: colors.primaryInk, fontSize: 13 },
});
