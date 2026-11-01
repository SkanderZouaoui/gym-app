import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts } from '../theme/tokens';
import { haptics } from '../utils/haptics';
import { boxForRatio, boxToPixels, containSize, moveBox, resizeCorner, type Box, type Corner, type Size } from '../utils/crop';

/** Côté le plus long de la photo enregistrée : assez pour un écran 3x, bien en deçà de la limite d'envoi (10 Mo). */
const MAX_SIDE = 2400;
const MIN_BOX = 56;
const HIT = 40;
const RATIOS: { key: string; label?: string; ratio: number | null }[] = [
  { key: 'free', ratio: null },
  { key: '16:10', label: '16:10', ratio: 16 / 10 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
];

interface Working {
  uri: string;
  w: number;
  h: number;
}

export interface EditedImage {
  uri: string;
  mimeType: string;
}

interface Props {
  visible: boolean;
  /** Fichier local à retoucher. */
  uri: string | null;
  title: string;
  /** Libellé du bouton de validation (« Enregistrer », « Suivante »…). */
  confirmLabel: string;
  /** « 2/5 » quand plusieurs photos s'enchaînent. */
  progress?: string;
  /** Si fourni, propose d'utiliser la photo telle quelle. */
  skipLabel?: string;
  onSkip?: () => void;
  onCancel: () => void;
  onDone: (image: EditedImage) => void;
}

/** Normalise l'orientation (EXIF) et renvoie un fichier JPEG local avec ses dimensions. */
async function bake(uri: string, ops?: (ctx: ReturnType<typeof ImageManipulator.manipulate>) => void, compress = 0.92): Promise<Working> {
  const ctx = ImageManipulator.manipulate(uri);
  ops?.(ctx);
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress });
  return { uri: saved.uri, w: saved.width, h: saved.height };
}

/**
 * Retouche d'une photo avant envoi : rognage libre ou à proportions fixes (poignées aux quatre coins, déplacement du cadre),
 * rotation par quarts de tour, miroir, retour à l'original.
 */
export function ImageEditor({ visible, uri, title, confirmLabel, progress, skipLabel, onSkip, onCancel, onDone }: Props) {
  const insets = useSafeAreaInsets();
  // Dans une modale, SafeAreaView ne reçoit pas les marges : on les applique à la main (barre d'état / encoche, barre de gestes).
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        {visible && uri ? (
          <EditorBody
            key={uri}
            uri={uri}
            title={title}
            confirmLabel={confirmLabel}
            progress={progress}
            skipLabel={skipLabel}
            onSkip={onSkip}
            onCancel={onCancel}
            onDone={onDone}
            topInset={topInset}
            bottomInset={insets.bottom}
          />
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

function EditorBody({
  uri,
  title,
  confirmLabel,
  progress,
  skipLabel,
  onSkip,
  onCancel,
  onDone,
  topInset,
  bottomInset,
}: Omit<Props, 'visible' | 'uri'> & { uri: string; topInset: number; bottomInset: number }) {
  const { t } = useTranslation();
  const [original, setOriginal] = useState<Working | null>(null);
  const [working, setWorking] = useState<Working | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [area, setArea] = useState<Size>({ w: 0, h: 0 });
  const [ratio, setRatio] = useState<number | null>(null);
  // Cadre de rognage en fractions (0–1) de l'image : indépendant de la taille d'affichage.
  const [frac, setFrac] = useState<Box>({ x: 0, y: 0, w: 1, h: 1 });

  // Au départ, l'image est « cuite » une fois pour appliquer son orientation et connaître sa taille réelle.
  useEffect(() => {
    let cancelled = false;
    bake(uri)
      .then((w) => {
        if (cancelled) return;
        setOriginal(w);
        setWorking(w);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const disp = useMemo<Size>(() => (working && area.w > 0 ? containSize(working, area) : { w: 0, h: 0 }), [working, area]);
  const offset = { x: (area.w - disp.w) / 2, y: (area.h - disp.h) / 2 };

  const toPx = (f: Box): Box => ({ x: f.x * disp.w, y: f.y * disp.h, w: f.w * disp.w, h: f.h * disp.h });

  // Dernières valeurs pour le PanResponder (créé une seule fois).
  const live = useRef({ disp, offset, frac, ratio });
  useEffect(() => {
    live.current = { disp, offset, frac, ratio };
  });
  const drag = useRef<{ mode: 'move' | Corner | null; start: Box }>({ mode: null, start: { x: 0, y: 0, w: 0, h: 0 } });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const L = live.current;
          if (L.disp.w === 0) return;
          // Les enfants ignorent le toucher (pointerEvents none) : locationX/Y sont relatifs à la zone d'édition.
          const px = e.nativeEvent.locationX - L.offset.x;
          const py = e.nativeEvent.locationY - L.offset.y;
          const b = { x: L.frac.x * L.disp.w, y: L.frac.y * L.disp.h, w: L.frac.w * L.disp.w, h: L.frac.h * L.disp.h };
          const corners: [Corner, number, number][] = [
            ['tl', b.x, b.y],
            ['tr', b.x + b.w, b.y],
            ['bl', b.x, b.y + b.h],
            ['br', b.x + b.w, b.y + b.h],
          ];
          const hit = corners.find(([, cx, cy]) => Math.abs(px - cx) <= HIT && Math.abs(py - cy) <= HIT);
          const inside = px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
          drag.current = { mode: hit ? hit[0] : inside ? 'move' : null, start: b };
          if (drag.current.mode) void haptics.selection();
        },
        onPanResponderMove: (_e, g) => {
          const { mode, start } = drag.current;
          const L = live.current;
          if (!mode || L.disp.w === 0) return;
          const next = mode === 'move' ? moveBox(start, g.dx, g.dy, L.disp) : resizeCorner(start, mode, g.dx, g.dy, L.disp, L.ratio, MIN_BOX);
          setFrac({ x: next.x / L.disp.w, y: next.y / L.disp.h, w: next.w / L.disp.w, h: next.h / L.disp.h });
        },
        onPanResponderRelease: () => {
          drag.current.mode = null;
        },
        onPanResponderTerminate: () => {
          drag.current.mode = null;
        },
      }),
    [],
  );

  /** Remet le cadre sur toute l'image (aux proportions voulues) pour une image et un affichage donnés. */
  const resetBox = (r: number | null, w: Working | null = working, a: Size = area) => {
    if (!w || a.w === 0) return;
    const d = containSize(w, a);
    const b = boxForRatio(d, r);
    setFrac({ x: b.x / d.w, y: b.y / d.h, w: b.w / d.w, h: b.h / d.h });
  };

  const transform = async (ops: (ctx: ReturnType<typeof ImageManipulator.manipulate>) => void) => {
    if (!working || busy) return;
    setBusy(true);
    try {
      const next = await bake(working.uri, ops);
      setWorking(next);
      resetBox(ratio, next);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (!original || busy) return;
    setWorking(original);
    setRatio(null);
    resetBox(null, original);
  };

  const apply = async () => {
    if (!working || busy || disp.w === 0) return;
    setBusy(true);
    try {
      const crop = boxToPixels(toPx(frac), disp, working);
      const full = crop.originX === 0 && crop.originY === 0 && crop.width >= working.w - 1 && crop.height >= working.h - 1;
      const outW = full ? working.w : crop.width;
      const outH = full ? working.h : crop.height;
      const out = await bake(
        working.uri,
        (ctx) => {
          if (!full) ctx.crop(crop);
          if (Math.max(outW, outH) > MAX_SIDE) ctx.resize(outW >= outH ? { width: MAX_SIDE } : { height: MAX_SIDE });
        },
        0.88,
      );
      onDone({ uri: out.uri, mimeType: 'image/jpeg' });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const box = toPx(frac);
  const ready = working !== null && disp.w > 0;

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: topInset + 6 }]}>
        <Pressable style={styles.round} onPress={onCancel} hitSlop={8} accessibilityLabel={t('common.annuler')}>
          <MaterialIcons name="close" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {progress ? <Text style={styles.progress}>{progress}</Text> : null}
        </View>
        <Pressable style={[styles.confirm, (!ready || busy) && { opacity: 0.5 }]} onPress={apply} disabled={!ready || busy}>
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </Pressable>
      </View>

      <View
        style={styles.canvas}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...responder.panHandlers}
      >
        {ready ? (
          <>
            <Image pointerEvents="none" source={{ uri: working.uri }} style={{ position: 'absolute', left: offset.x, top: offset.y, width: disp.w, height: disp.h }} resizeMode="stretch" />
            {/* Zones écartées, assombries */}
            <View pointerEvents="none" style={[styles.dim, { left: offset.x, top: offset.y, width: disp.w, height: box.y }]} />
            <View pointerEvents="none" style={[styles.dim, { left: offset.x, top: offset.y + box.y + box.h, width: disp.w, height: disp.h - box.y - box.h }]} />
            <View pointerEvents="none" style={[styles.dim, { left: offset.x, top: offset.y + box.y, width: box.x, height: box.h }]} />
            <View pointerEvents="none" style={[styles.dim, { left: offset.x + box.x + box.w, top: offset.y + box.y, width: disp.w - box.x - box.w, height: box.h }]} />
            {/* Cadre, grille des tiers et poignées */}
            <View pointerEvents="none" style={[styles.frame, { left: offset.x + box.x, top: offset.y + box.y, width: box.w, height: box.h }]}>
              <View style={[styles.gridV, { left: '33.33%' }]} />
              <View style={[styles.gridV, { left: '66.66%' }]} />
              <View style={[styles.gridH, { top: '33.33%' }]} />
              <View style={[styles.gridH, { top: '66.66%' }]} />
              <View style={[styles.handle, styles.hTL]} />
              <View style={[styles.handle, styles.hTR]} />
              <View style={[styles.handle, styles.hBL]} />
              <View style={[styles.handle, styles.hBR]} />
            </View>
          </>
        ) : failed ? (
          <View style={styles.center}>
            <MaterialIcons name="error-outline" size={32} color="#FFFFFF" />
            <Text style={styles.errorText}>{t('common.photo_edit_error')}</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        )}
        {busy && ready ? (
          <View style={[styles.center, StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: bottomInset + 12 }]}>
        <View style={styles.ratios}>
          {RATIOS.map((r) => {
            const on = ratio === r.ratio;
            return (
              <Pressable
                key={r.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => {
                  setRatio(r.ratio);
                  resetBox(r.ratio);
                  void haptics.selection();
                }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{r.label ?? t('common.photo_edit_free')}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.tools}>
          <Tool icon="rotate-left" label={t('common.photo_edit_rotate_left')} onPress={() => transform((c) => c.rotate(-90))} />
          <Tool icon="rotate-right" label={t('common.photo_edit_rotate_right')} onPress={() => transform((c) => c.rotate(90))} />
          <Tool icon="flip" label={t('common.photo_edit_flip')} onPress={() => transform((c) => c.flip('horizontal'))} />
          <Tool icon="restart-alt" label={t('common.photo_edit_reset')} onPress={reset} />
        </View>
        {onSkip && skipLabel ? (
          <Pressable onPress={onSkip} style={styles.skip} hitSlop={8}>
            <Text style={styles.skipText}>{skipLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Tool({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.tool} onPress={onPress} accessibilityLabel={label} hitSlop={6}>
      <MaterialIcons name={icon} size={24} color="#FFFFFF" />
      <Text style={styles.toolText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const HANDLE = 22;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0D' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.head, fontSize: 16, color: '#FFFFFF' },
  progress: { fontFamily: fonts.bodyBold, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  confirm: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#0B0B0D' },
  canvas: { flex: 1, marginVertical: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 30 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.58)' },
  frame: { position: 'absolute', borderWidth: 1.5, borderColor: '#FFFFFF' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  handle: { position: 'absolute', width: HANDLE, height: HANDLE, borderColor: '#FFFFFF' },
  hTL: { top: -3, left: -3, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  hTR: { top: -3, right: -3, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  hBL: { bottom: -3, left: -3, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  hBR: { bottom: -3, right: -3, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  bottom: { paddingTop: 10, paddingHorizontal: 14, gap: 12 },
  ratios: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: '#FFFFFF' },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#FFFFFF' },
  chipTextOn: { color: '#0B0B0D' },
  tools: { flexDirection: 'row', justifyContent: 'space-around' },
  tool: { alignItems: 'center', gap: 4, minWidth: 64 },
  toolText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
  skip: { alignSelf: 'center', paddingVertical: 4 },
  skipText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },
});
