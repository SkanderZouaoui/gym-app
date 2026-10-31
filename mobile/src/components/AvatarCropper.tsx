import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, spacing } from '../theme/tokens';
import type { AvatarCropRect } from '../hooks/useProfile';

const MAX_ZOOM = 5;
const MIN_ZOOM = 1;

interface Props {
  visible: boolean;
  imageUri: string | null;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (rect: AvatarCropRect) => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * Recadrage de la photo de profil : l'image se déplace (un doigt) et se zoome (pincement ou boutons +/−)
 * dans un cadre circulaire ; la zone visible est renvoyée en fractions de l'image d'origine
 * (le recadrage lui-même est fait par l'API).
 */
export function AvatarCropper({ visible, imageUri, saving, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const viewport = Math.min(width - 48, 340);
  const styles = useMemo(() => makeStyles(viewport), [viewport]);

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Échelle de base : l'image couvre exactement le cadre ; le zoom s'ajoute par-dessus.
  const base = natural ? viewport / Math.min(natural.w, natural.h) : 1;
  const scale = base * zoom;

  const limits = (z: number) => {
    if (!natural) return { mx: 0, my: 0 };
    const s = base * z;
    return { mx: Math.max(0, (natural.w * s - viewport) / 2), my: Math.max(0, (natural.h * s - viewport) / 2) };
  };

  // Remise à zéro à chaque ouverture + lecture de la taille réelle de l'image.
  useEffect(() => {
    if (!visible || !imageUri) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural(null);
    setLoadError(false);
    Image.getSize(imageUri, (w, h) => setNatural({ w, h }), () => setLoadError(true));
  }, [visible, imageUri]);

  // L'état courant est lu depuis une ref par le PanResponder (créé une seule fois).
  const live = useRef({ zoom, offset, natural, base, viewport });
  live.current = { zoom, offset, natural, base, viewport };
  const gesture = useRef({ touches: 0, ox: 0, oy: 0, zoom: 1, dx0: 0, dy0: 0, dist0: 0 });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gesture.current.touches = 0;
        },
        onPanResponderMove: (e, g) => {
          const { natural: nat, base: b, viewport: v } = live.current;
          if (!nat) return;
          const touches = e.nativeEvent.touches;
          const st = gesture.current;
          const dist = touches.length >= 2 ? Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY) : 0;
          // Le nombre de doigts a changé : on repart des valeurs courantes pour éviter les sauts.
          if (touches.length !== st.touches) {
            st.touches = touches.length;
            st.ox = live.current.offset.x;
            st.oy = live.current.offset.y;
            st.zoom = live.current.zoom;
            st.dx0 = g.dx;
            st.dy0 = g.dy;
            st.dist0 = dist;
            return;
          }
          const nextZoom = touches.length >= 2 && st.dist0 > 0 ? clamp(st.zoom * (dist / st.dist0), MIN_ZOOM, MAX_ZOOM) : live.current.zoom;
          const s = b * nextZoom;
          const mx = Math.max(0, (nat.w * s - v) / 2);
          const my = Math.max(0, (nat.h * s - v) / 2);
          setZoom(nextZoom);
          setOffset({ x: clamp(st.ox + (g.dx - st.dx0), -mx, mx), y: clamp(st.oy + (g.dy - st.dy0), -my, my) });
        },
      }),
    [],
  );

  const changeZoom = (delta: number) => {
    const z = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM);
    const { mx, my } = limits(z);
    setZoom(z);
    setOffset((o) => ({ x: clamp(o.x, -mx, mx), y: clamp(o.y, -my, my) }));
  };

  const confirm = () => {
    if (!natural) return;
    // Un point du cadre (relatif à son centre) correspond au pixel natural/2 + (p − offset) / scale de l'image.
    const sizePx = viewport / scale;
    const leftPx = natural.w / 2 - viewport / (2 * scale) - offset.x / scale;
    const topPx = natural.h / 2 - viewport / (2 * scale) - offset.y / scale;
    onConfirm({
      left: clamp(leftPx / natural.w, 0, 1),
      top: clamp(topPx / natural.h, 0, 1),
      width: clamp(sizePx / natural.w, 0.01, 1),
      height: clamp(sizePx / natural.h, 0.01, 1),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10} disabled={saving} accessibilityRole="button" accessibilityLabel={t('common.annuler')}>
            <MaterialIcons name="close" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.title}>{t('common.photo_crop_title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.body}>
          <View style={styles.viewport} {...responder.panHandlers}>
            {natural && imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{
                  position: 'absolute',
                  width: natural.w * scale,
                  height: natural.h * scale,
                  left: viewport / 2 - (natural.w * scale) / 2 + offset.x,
                  top: viewport / 2 - (natural.h * scale) / 2 + offset.y,
                }}
              />
            ) : loadError ? (
              <Text style={styles.error}>{t('common.photo_crop_load_error')}</Text>
            ) : (
              <ActivityIndicator color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.hint}>{t('common.photo_crop_hint')}</Text>

          <View style={styles.zoomRow}>
            <Pressable onPress={() => changeZoom(-0.4)} disabled={!natural || zoom <= MIN_ZOOM} style={[styles.zoomBtn, (!natural || zoom <= MIN_ZOOM) && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="−">
              <MaterialIcons name="remove" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.zoomTrack}>
              <View style={[styles.zoomFill, { width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` }]} />
            </View>
            <Pressable onPress={() => changeZoom(0.4)} disabled={!natural || zoom >= MAX_ZOOM} style={[styles.zoomBtn, (!natural || zoom >= MAX_ZOOM) && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="+">
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable onPress={confirm} disabled={!natural || saving} style={[styles.save, (!natural || saving) && { opacity: 0.6 }]} accessibilityRole="button">
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>{t('common.photo_crop_save')}</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(viewport: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0B0817' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    title: { fontFamily: fonts.headBold, fontSize: 17, color: '#FFFFFF' },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    viewport: {
      width: viewport, height: viewport, borderRadius: viewport / 2, overflow: 'hidden', backgroundColor: '#1A1431',
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#8B5CF6',
    },
    hint: { fontFamily: fonts.body, fontSize: 13, color: '#A29BC2', textAlign: 'center', paddingHorizontal: spacing.lg },
    error: { fontFamily: fonts.body, fontSize: 13, color: '#FCA5A5', textAlign: 'center', padding: spacing.lg },
    zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, width: viewport },
    zoomBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2E2650', alignItems: 'center', justifyContent: 'center' },
    zoomTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#2E2650', overflow: 'hidden' },
    zoomFill: { height: 4, backgroundColor: '#8B5CF6' },
    footer: { padding: spacing.lg },
    save: { height: 54, borderRadius: 18, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
    saveText: { fontFamily: fonts.headBold, fontSize: 16, color: '#FFFFFF' },
  });
}
