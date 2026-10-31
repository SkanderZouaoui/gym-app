import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useAdminRooms, useDeleteRoom, useSaveRoom } from '../../src/hooks/useAdmin';
import { Banner, BottomSheet, Toast } from '../../src/components/ui';
import { KeyboardAwareScreen } from '../../src/components/ui/KeyboardAwareScreen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { RoomMediaSection } from '../../src/components/RoomMediaSection';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';

interface Form {
  name: string;
  capacity: string;
}

const NEW_ROOM: Form = { name: '', capacity: '20' };

/** Salle (admin) : informations, photos (affichées sur la fiche des cours donnés dans la salle) et suppression. */
export default function RoomScreen() {
  const { t } = useTranslation();
  const { id: paramId } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: rooms, refetch } = useAdminRooms();
  const { refreshing, offlineToastVisible, onRefresh } = useOfflineAwareRefresh(refetch);
  const save = useSaveRoom();
  const remove = useDeleteRoom();

  // Une salle tout juste créée reste ouverte (en édition) pour qu'on puisse y ajouter ses photos tout de suite.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const id = paramId ?? createdId ?? undefined;
  const room = id ? rooms?.find((x) => x.id === id) : undefined;
  const base: Form = room ? { name: room.name, capacity: String(room.capacity) } : NEW_ROOM;

  const [patch, setPatch] = useState<Partial<Form>>({});
  const form: Form = { ...base, ...patch };
  const dirty = (Object.keys(patch) as (keyof Form)[]).some((k) => patch[k] !== base[k]);
  const valid = form.name.trim().length > 0 && Number(form.capacity) >= 1;

  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cover = room?.galleryUrls?.[0];
  const photoCount = room?.galleryKeys.length ?? 0;

  const submit = () => {
    setMessage(null);
    save.mutate(
      { id, name: form.name.trim(), capacity: Number(form.capacity) },
      {
        onSuccess: (saved) => {
          setPatch({});
          if (!id) {
            setCreatedId(saved.id);
            setMessage({ tone: 'success', text: t('common.room_created') });
          } else setMessage({ tone: 'success', text: t('common.class_type_saved') });
        },
        onError: () => setMessage({ tone: 'danger', text: t('admin.enregistrement_impossible_reessayez') }),
      },
    );
  };

  const doDelete = () => {
    if (!id) return;
    remove.mutate(id, {
      onSuccess: () => {
        setConfirmDelete(false);
        router.back();
      },
      onError: () => {
        setConfirmDelete(false);
        setMessage({ tone: 'danger', text: t('admin.est_utilisee_par_des_cours', { name: form.name }) });
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScreen
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        footer={
          <View style={styles.footer}>
            <Button
              label={save.isPending ? t('common.enregistrement') : t('member.enregistrer')}
              onPress={submit}
              loading={save.isPending}
              disabled={!valid || (!!id && !dirty)}
            />
          </View>
        }
      >
        <ScreenHeader title={id ? t('common.room_title') : t('common.room_new')} fallbackHref="/(admin)/settings" />

        <View style={styles.heroShadow}>
          <View style={styles.hero}>
            {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} /> : null}
            <LinearGradient
              colors={cover ? ['rgba(46,16,101,0.35)', 'rgba(46,16,101,0.9)'] : [colors.primary, colors.primaryPressed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.heroKicker}>{t('common.room_kicker')}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{form.name.trim() || t('common.room_new')}</Text>
            <View style={styles.chips}>
              <View style={styles.chip}><MaterialIcons name="groups" size={14} color="#FFFFFF" /><Text style={styles.chipText}>{form.capacity || '–'} {t('common.class_type_places')}</Text></View>
              <View style={styles.chip}><MaterialIcons name="photo-library" size={14} color="#FFFFFF" /><Text style={styles.chipText}>{photoCount}</Text></View>
            </View>
          </View>
        </View>

        {message ? <Banner tone={message.tone} icon={message.tone === 'success' ? 'check-circle' : message.tone === 'danger' ? 'error' : 'info-outline'} text={message.text} /> : null}

        <Text style={styles.section}>{t('common.class_type_infos')}</Text>
        <TextField
          label={t('common.nom')}
          icon="meeting-room"
          value={form.name}
          onChangeText={(v) => setPatch((p) => ({ ...p, name: v }))}
          placeholder={t('admin.ex_studio_b')}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
        <TextField
          label={t('admin.capacite_places')}
          icon="groups"
          value={form.capacity}
          onChangeText={(v) => setPatch((p) => ({ ...p, capacity: v.replace(/[^0-9]/g, '') }))}
          keyboardType="number-pad"
        />

        <View style={styles.photosCard}>
          {id ? (
            <RoomMediaSection roomId={id} />
          ) : (
            <View style={styles.photosLocked}>
              <MaterialIcons name="photo-library" size={22} color={colors.primaryInk} />
              <Text style={styles.photosLockedText}>{t('common.room_photos_locked')}</Text>
            </View>
          )}
        </View>

        {id ? <Button label={t('common.room_delete')} variant="danger" onPress={() => setConfirmDelete(true)} /> : null}
      </KeyboardAwareScreen>

      {offlineToastVisible ? <Toast icon="cloud-off" text={t('member.pas_de_connexion_impossible_dactualiser')} iconColor={colors.warningInk} /> : null}

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={styles.sheetTitle}>{t('common.supprimer_2', { name: form.name })}</Text>
        <Text style={styles.sheetText}>{t('admin.une_salle_utilisee_par_des')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('admin.oui_supprimer')} variant="danger" loading={remove.isPending} onPress={doDelete} />
          <Button label={t('common.annuler')} variant="outline" onPress={() => setConfirmDelete(false)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 14, paddingBottom: spacing.xl },
    heroShadow: { borderRadius: 26, shadowColor: colors.primary, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 7 },
    hero: { borderRadius: 26, padding: 20, overflow: 'hidden', minHeight: 150, justifyContent: 'flex-end', gap: 4, backgroundColor: colors.primary },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.85)' },
    heroTitle: { fontFamily: fonts.head, fontSize: 26, letterSpacing: -0.8, color: '#FFFFFF' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    section: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text, marginTop: 6 },
    photosCard: { padding: 14, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    photosLocked: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    photosLockedText: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    footer: { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  });
}
