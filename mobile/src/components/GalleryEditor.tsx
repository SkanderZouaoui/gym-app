import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Banner } from './ui';
import { ScrollLockContext } from './ui/KeyboardAwareScreen';
import { ImageEditor, type EditedImage } from './ImageEditor';
import { useGalleryMutations, type PickedImage } from '../hooks/useGallery';
import { haptics } from '../utils/haptics';

const COLUMNS = 3;
const GAP = 10;
const MAX_PER_PICK = 10;
/** Doit rester aligné sur MAX_TYPE_GALLERY côté API. */
const MAX_GALLERY = 12;
const LONG_PRESS_MS = 220;

interface Props {
  title: string;
  hint: string;
  keys: string[];
  urls: string[];
  mutations: ReturnType<typeof useGalleryMutations>;
}

/** Fichier temporaire (cache) où télécharger une photo à retoucher. */
const tempImageFile = () => new File(Paths.cache, `gallery-edit-${Date.now()}.jpg`);

/** Retouche en cours : photos tout juste choisies (une par une) ou photo déjà en galerie. */
type EditorState =
  | { kind: 'import'; queue: PickedImage[]; index: number; done: PickedImage[] }
  | { kind: 'edit'; key: string; uri: string };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Coin haut-gauche d'une case de la grille pour une taille de tuile donnée. */
const slotPosition = (tileSize: number, slot: number) => ({ x: (slot % COLUMNS) * (tileSize + GAP), y: Math.floor(slot / COLUMNS) * (tileSize + GAP) });

/**
 * Galerie photos éditable (type de cours, salle) : import multiple (jusqu'à 10 à la fois, 12 au total), suppression, et
 * réordonnancement par glisser-déposer — appui long sur une photo pour la saisir, puis glisser-la ; les autres se décalent
 * en direct. La première photo sert de couverture.
 */
export function GalleryEditor({ title, hint, keys, urls, mutations }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { add, remove, reorder, replace } = mutations;
  const setScrollEnabled = useContext(ScrollLockContext);
  const [width, setWidth] = useState(0);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'warning'; text: string } | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);

  const remaining = MAX_GALLERY - keys.length;
  const offset = remaining > 0 ? 1 : 0; // la tuile « Ajouter » occupe la première case tant qu'il reste de la place
  const tile = width > 0 ? Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS) : 0;

  // --- glisser-déposer ---
  const [liveOrder, setLiveOrder] = useState<string[] | null>(null); // ordre provisoire pendant le glissement
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const order = liveOrder ?? keys;
  const urlByKey = useMemo(() => new Map(keys.map((k, i) => [k, urls[i]])), [keys, urls]);
  const positions = useRef(new Map<string, Animated.ValueXY>());
  const drag = useRef({ key: null as string | null, start: { x: 0, y: 0 }, captured: false, order: [] as string[] });

  const slotXY = (slot: number) => slotPosition(tile, slot);
  const positionOf = (key: string, slot: number) => {
    let v = positions.current.get(key);
    if (!v) {
      v = new Animated.ValueXY(slotXY(slot));
      positions.current.set(key, v);
    }
    return v;
  };

  // Les photos non saisies glissent vers leur case dès que l'ordre (provisoire ou définitif) ou la mise en page change.
  useEffect(() => {
    if (tile === 0) return;
    for (const k of [...positions.current.keys()]) if (!order.includes(k)) positions.current.delete(k);
    order.forEach((k, i) => {
      const v = positions.current.get(k);
      if (!v || k === drag.current.key) return;
      Animated.spring(v, { toValue: slotXY(i + offset), useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, offset, tile]);

  const latest = useRef({ tile, offset, keys });
  useLayoutEffect(() => {
    latest.current = { tile, offset, keys };
  });

  const resetDrag = () => {
    drag.current = { key: null, start: { x: 0, y: 0 }, captured: false, order: [] };
    setDraggingKey(null);
    setLiveOrder(null);
    setScrollEnabled(true);
  };

  const startDrag = (key: string, index: number) => {
    const L = latest.current;
    const v = positionOf(key, index + L.offset);
    drag.current = { key, start: slotPosition(L.tile, index + L.offset), captured: false, order: [...L.keys] };
    v.setValue(drag.current.start);
    setDraggingKey(key);
    setLiveOrder([...L.keys]);
    setScrollEnabled(false);
    void haptics.selection();
  };

  /** Relâché sans avoir bougé : le doigt n'a jamais « saisi » la photo, on annule la sélection. */
  const cancelIfNotMoved = () => {
    setTimeout(() => {
      if (drag.current.key && !drag.current.captured) resetDrag();
    }, 90);
  };

  const finishDrag = () => {
    const d = drag.current;
    if (!d.key) return;
    const L = latest.current;
    const final = d.order;
    const v = positions.current.get(d.key);
    if (v) Animated.spring(v, { toValue: slotPosition(L.tile, final.indexOf(d.key) + L.offset), useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    drag.current = { key: null, start: { x: 0, y: 0 }, captured: false, order: [] };
    setDraggingKey(null);
    setScrollEnabled(true);
    const changed = final.some((k, i) => k !== L.keys[i]);
    if (!changed) {
      setLiveOrder(null);
      return;
    }
    setMessage(null);
    // L'ordre provisoire reste affiché jusqu'à la réponse (succès : la liste est déjà à jour ; échec : retour à l'ordre d'origine).
    reorder.mutate(final, {
      onError: () => setMessage({ tone: 'danger', text: t('common.class_media_reorder_error') }),
      onSettled: () => setLiveOrder(null),
    });
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Une fois la photo saisie (appui long), le glissement prend la main sur la tuile touchée.
        onMoveShouldSetPanResponderCapture: () => drag.current.key !== null,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          drag.current.captured = true;
        },
        onPanResponderMove: (_e, g) => {
          const d = drag.current;
          if (!d.key) return;
          const { tile: size, offset: off, keys: all } = latest.current;
          const v = positions.current.get(d.key);
          const x = d.start.x + g.dx;
          const y = d.start.y + g.dy;
          v?.setValue({ x, y });
          const step = size + GAP;
          const col = clamp(Math.floor((x + size / 2) / step), 0, COLUMNS - 1);
          const row = Math.max(0, Math.floor((y + size / 2) / step));
          const target = clamp(row * COLUMNS + col - off, 0, all.length - 1);
          const current = d.order.indexOf(d.key);
          if (target !== current) {
            const next = [...d.order];
            next.splice(current, 1);
            next.splice(target, 0, d.key);
            d.order = next;
            setLiveOrder(next);
            void haptics.selection();
          }
        },
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pickAndUpload = async () => {
    if (add.isPending || remaining <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('member.permission_refusee'), t('member.lacces_a_vos_photos_est'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.min(MAX_PER_PICK, remaining),
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    // Chaque photo passe d'abord par l'éditeur (rogner, pivoter…) ; « Utiliser telle quelle » l'envoie sans retouche.
    setMessage(null);
    setEditor({ kind: 'import', queue: result.assets.slice(0, remaining).map((a) => ({ uri: a.uri, mimeType: a.mimeType })), index: 0, done: [] });
  };

  const upload = async (images: PickedImage[]) => {
    const { added, failed } = await add.mutateAsync(images);
    if (failed === 0) setMessage({ tone: 'success', text: t('common.class_media_added', { count: added }) });
    else setMessage({ tone: added > 0 ? 'warning' : 'danger', text: t('common.class_media_upload_error', { count: failed }) });
  };

  /** Photo suivante de l'import (retouchée ou non) ; la dernière déclenche l'envoi de toutes. */
  const advance = (image: PickedImage) => {
    if (editor?.kind !== 'import') return;
    const done = [...editor.done, image];
    if (editor.index + 1 < editor.queue.length) {
      setEditor({ ...editor, index: editor.index + 1, done });
    } else {
      setEditor(null);
      void upload(done);
    }
  };

  /** Retouche d'une photo déjà en galerie : on la télécharge, puis la version modifiée la remplace à la même place. */
  const openEdit = async (key: string, url: string) => {
    if (preparing || replace.isPending) return;
    if (remaining <= 0) {
      setMessage({ tone: 'warning', text: t('common.photo_edit_full') });
      return;
    }
    setMessage(null);
    setPreparing(key);
    try {
      const file = await File.downloadFileAsync(url, tempImageFile());
      setEditor({ kind: 'edit', key, uri: file.uri });
    } catch {
      setMessage({ tone: 'danger', text: t('common.photo_edit_error') });
    } finally {
      setPreparing(null);
    }
  };

  const saveEdit = (image: EditedImage) => {
    if (editor?.kind !== 'edit') return;
    const oldKey = editor.key;
    setEditor(null);
    replace.mutate(
      { oldKey, image, keys },
      {
        onSuccess: () => setMessage({ tone: 'success', text: t('common.photo_edit_replaced') }),
        onError: () => setMessage({ tone: 'danger', text: t('common.photo_edit_replace_error') }),
      },
    );
  };

  const confirmRemove = (key: string) => {
    Alert.alert(t('common.class_media_delete_title'), t('common.class_media_delete_text'), [
      { text: t('common.annuler'), style: 'cancel' },
      {
        text: t('common.class_media_delete_confirm'),
        style: 'destructive',
        onPress: () => {
          setMessage(null);
          remove.mutate(key, { onError: () => setMessage({ tone: 'danger', text: t('common.class_media_delete_error') }) });
        },
      },
    ]);
  };

  const slots = order.length + offset;
  const rows = Math.max(1, Math.ceil(slots / COLUMNS));
  const gridHeight = tile > 0 ? rows * tile + (rows - 1) * GAP : 0;

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{keys.length}/{MAX_GALLERY}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>

      {message ? <Banner tone={message.tone} icon={message.tone === 'success' ? 'check-circle' : 'error-outline'} text={message.text} /> : null}

      {tile > 0 ? (
        <View style={{ height: gridHeight }} {...responder.panHandlers}>
          {remaining > 0 ? (
            <Pressable
              onPress={pickAndUpload}
              disabled={add.isPending}
              style={[styles.tile, styles.addTile, { width: tile, height: tile, left: 0, top: 0 }, add.isPending && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.class_media_add')}
            >
              <MaterialIcons name={add.isPending ? 'hourglass-top' : 'add-photo-alternate'} size={30} color={colors.primary} />
              <Text style={styles.addText}>{add.isPending ? t('common.class_media_uploading') : t('common.class_media_add')}</Text>
            </Pressable>
          ) : null}

          {order.map((key, i) => {
            const url = urlByKey.get(key);
            if (!url) return null;
            const lifted = key === draggingKey;
            return (
              <Animated.View
                key={key}
                style={[
                  styles.tile,
                  styles.photoTile,
                  { width: tile, height: tile, zIndex: lifted ? 10 : 1 },
                  lifted && styles.lifted,
                  { transform: [...positionOf(key, i + offset).getTranslateTransform(), { scale: lifted ? 1.08 : 1 }] },
                ]}
              >
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => void openEdit(key, url)}
                  onLongPress={() => startDrag(key, i)}
                  delayLongPress={LONG_PRESS_MS}
                  onPressOut={cancelIfNotMoved}
                  accessibilityRole="imagebutton"
                  accessibilityHint={t('common.class_media_reorder_hint')}
                >
                  <Image source={{ uri: url }} style={styles.image} />
                  {preparing === key || (replace.isPending && replace.variables?.oldKey === key) ? (
                    <View style={styles.busy} pointerEvents="none">
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  ) : null}
                </Pressable>
                {!lifted ? (
                  <View style={styles.editBadge} pointerEvents="none">
                    <MaterialIcons name="crop" size={14} color="#FFFFFF" />
                  </View>
                ) : null}

                {i === 0 ? (
                  <View style={styles.coverBadge} pointerEvents="none">
                    <MaterialIcons name="star" size={11} color="#FFFFFF" />
                    <Text style={styles.coverText}>{t('common.class_media_cover')}</Text>
                  </View>
                ) : null}

                {!lifted ? (
                  <Pressable onPress={() => confirmRemove(key)} hitSlop={6} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('common.class_media_delete_confirm')} disabled={remove.isPending}>
                    <MaterialIcons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      {keys.length === 0 ? <Text style={styles.empty}>{t('common.class_media_empty')}</Text> : null}
      {keys.length > 0 ? <Text style={styles.empty}>{t('common.photo_edit_tap_hint')}</Text> : null}
      {keys.length > 1 ? <Text style={styles.empty}>{t('common.class_media_reorder_hint')}</Text> : null}
      {remaining <= 0 ? <Text style={styles.empty}>{t('common.class_media_full')}</Text> : null}

      <ImageEditor
        visible={editor !== null}
        uri={editor?.kind === 'import' ? editor.queue[editor.index].uri : editor?.kind === 'edit' ? editor.uri : null}
        title={t('common.photo_edit_title')}
        progress={editor?.kind === 'import' && editor.queue.length > 1 ? `${editor.index + 1}/${editor.queue.length}` : undefined}
        confirmLabel={
          editor?.kind === 'import' && editor.queue.length > 1
            ? editor.index + 1 < editor.queue.length ? t('common.photo_edit_next') : t('common.photo_edit_done')
            : t('common.photo_edit_apply')
        }
        skipLabel={editor?.kind === 'import' ? t('common.photo_edit_use_original') : undefined}
        onSkip={editor?.kind === 'import' ? () => advance(editor.queue[editor.index]) : undefined}
        onCancel={() => setEditor(null)}
        onDone={(image) => (editor?.kind === 'import' ? advance(image) : saveEdit(image))}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text },
    count: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
    hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: -4 },
    tile: { position: 'absolute', borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface2 },
    photoTile: { left: 0, top: 0 },
    lifted: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    addTile: {
      alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, backgroundColor: colors.primarySoft,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryBorder,
    },
    addText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk, textAlign: 'center' },
    image: { width: '100%', height: '100%' },
    busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
    editBadge: {
      position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)',
    },
    coverBadge: {
      position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    },
    coverText: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: '#FFFFFF' },
    remove: {
      position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
    },
    empty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
  });
}
