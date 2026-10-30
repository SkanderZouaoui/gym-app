import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { TextField } from '../../src/components/TextField';
import { Banner, BottomSheet, ScreenTitle, SkeletonList } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { announcementAudienceLabel } from '../../src/i18n/labels';
import { DateField } from '../../src/components/ui/DateTimeFields';
import { StickyActionBar, STICKY_BAR_SPACE } from '../../src/components/ui/StickyActionBar';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useAnnouncements, useDeleteAnnouncement, useSendAnnouncement, useUpdateAnnouncement, type Announcement } from '../../src/hooks/useAdmin';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../src/i18n';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fr = (s: string | null) => (s ? new Date(s).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '…');

function status(a: Announcement): 'scheduled' | 'published' | 'ended' {
  const today = iso(new Date());
  if (a.startsOn && a.startsOn.slice(0, 10) > today) return 'scheduled';
  if (a.endsOn && a.endsOn.slice(0, 10) < today) return 'ended';
  return 'published';
}

/** Annonces (admin) : message sur l'accueil adhérent pendant une période, avec push facultatif. */
export default function AdminAnnouncementsScreen() {
  useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: announcements, refetch, isLoading } = useAnnouncements();
  const send = useSendAnnouncement();
  const updateAnn = useUpdateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startsOn, setStartsOn] = useState(iso(new Date()));
  const [endsOn, setEndsOn] = useState('');
  const [push, setPush] = useState(true);
  const [audience, setAudience] = useState<'MEMBERS' | 'STAFF' | 'COACH' | 'TEAM' | 'ALL'>('MEMBERS');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const dateOk = (v: string) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v);
  const valid = title.trim() && body.trim() && /^\d{4}-\d{2}-\d{2}$/.test(startsOn) && dateOk(endsOn) && (!endsOn || endsOn >= startsOn);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setStartsOn(iso(new Date()));
    setEndsOn('');
    setPush(true);
    setAudience('MEMBERS');
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setStartsOn(a.startsOn ? a.startsOn.slice(0, 10) : iso(new Date()));
    setEndsOn(a.endsOn ? a.endsOn.slice(0, 10) : '');
    setDone(null);
    setError(null);
    setOpen(true);
  };

  const publish = () => {
    setError(null);
    if (editingId) {
      updateAnn.mutate(
        { id: editingId, title: title.trim(), body: body.trim(), startsOn, endsOn: endsOn || null },
        {
          onSuccess: () => {
            setDone(i18n.t('admin.annonce_modifiee'));
            setOpen(false);
            resetForm();
          },
          onError: () => setError(i18n.t('admin.la_modification_a_echoue_reessayez')),
        },
      );
      return;
    }
    send.mutate(
      { title: title.trim(), body: body.trim(), startsOn, endsOn: endsOn || undefined, push, audience },
      {
        onSuccess: (r) => {
          setDone(push ? i18n.t('admin.publiee_et_envoyee_en_push', { recipientCount: r.recipientCount }) : i18n.t('admin.annonce_publiee'));
          setOpen(false);
          resetForm();
        },
        onError: () => setError(i18n.t('admin.lannonce_na_pas_pu_etre')),
      },
    );
  };

  const tag = (s: ReturnType<typeof status>) =>
    s === 'published' ? { bg: colors.successSoft, fg: colors.successInk } : s === 'scheduled' ? { bg: colors.warningSoft, fg: colors.warningInk } : { bg: colors.surface2, fg: colors.muted };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, open && { paddingBottom: STICKY_BAR_SPACE + 30 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{i18n.t('common.plus')}</Text>
        </Pressable>
        <ScreenTitle
          title={i18n.t('admin.annonces')}
          subtitle={i18n.t('admin.push_ecran_daccueil_adherent')}
          right={
            <Pressable onPress={() => { if (open) resetForm(); setOpen((o) => !o); }} style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}>
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name={open ? 'close' : 'add'} size={24} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />

        {done ? <Banner tone="success" icon="check-circle-outline" text={done} /> : null}
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        {open ? (
          <View style={[styles.card, cardShadow]}>
            <TextField label={i18n.t('admin.titre')} value={title} onChangeText={setTitle} placeholder={i18n.t('admin.ex_fermeture_exceptionnelle')} />
            <TextField label={i18n.t('common.message')} value={body} onChangeText={setBody} placeholder={i18n.t('admin.votre_message_aux_adherents')} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><DateField label={i18n.t('admin.debut')} value={startsOn} onChange={setStartsOn} /></View>
              <View style={{ flex: 1 }}><DateField label={i18n.t('admin.fin_facultatif')} value={endsOn} onChange={setEndsOn} clearable icon="event-available" minimumDate={startsOn ? new Date(startsOn) : undefined} /></View>
            </View>
            {!editingId ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.switchLabel}>{i18n.t('admin.recipients_label')}</Text>
                <View style={styles.audRow}>
                  {(['MEMBERS', 'TEAM', 'STAFF', 'COACH', 'ALL'] as const).map((k) => (
                    <Pressable key={k} onPress={() => setAudience(k)} style={[styles.audChip, audience === k && styles.audChipOn]}>
                      <Text style={[styles.audText, audience === k && { color: colors.primaryContrast }]}>{announcementAudienceLabel(k)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {!editingId ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{i18n.t('admin.envoyer_une_notification_push')}</Text>
              <Switch value={push} onValueChange={setPush} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
            </View>
            ) : (
              <Text style={styles.editNote}>{i18n.t('admin.les_notifications_deja_envoyees_ne')}</Text>
            )}
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {(announcements ?? []).map((a) => {
            const st = status(a);
            const t = tag(st);
            return (
              <View key={a.id} style={[styles.item, cardShadow]}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{a.title}</Text>
                  <View style={[styles.tag, { backgroundColor: t.bg }]}>
                    <Text style={[styles.tagText, { color: t.fg }]}>{i18n.t(`admin.status_${st}`)}</Text>
                  </View>
                </View>
                <Text style={styles.itemBody} numberOfLines={3}>{a.body}</Text>
                <View style={styles.period}>
                  <MaterialIcons name="event" size={16} color={colors.primaryInk} />
                  <Text style={[styles.periodText, { flex: 1 }]}>{announcementAudienceLabel(a.audience)} · {fr(a.startsOn)} → {fr(a.endsOn)}{a.push ? i18n.t('admin.push_envoye') : ''}</Text>
                  <Pressable accessibilityLabel={i18n.t('admin.modifier_lannonce')} onPress={() => startEdit(a)} style={styles.iconBtn} hitSlop={6}>
                    <MaterialIcons name="edit" size={18} color={colors.primaryInk} />
                  </Pressable>
                  <Pressable accessibilityLabel={i18n.t('admin.supprimer_lannonce')} onPress={() => setToDelete(a)} style={[styles.iconBtn, { backgroundColor: colors.dangerSoft }]} hitSlop={6}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.dangerInk} />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {isLoading ? <SkeletonList count={5} /> : (announcements ?? []).length === 0 ? <Text style={styles.empty}>{i18n.t('admin.aucune_annonce_pour_le_moment')}</Text> : null}
        </View>
      </ScrollView>
      <StickyActionBar visible={open} label={editingId ? i18n.t('common.enregistrer_les_modifications') : i18n.t('admin.publier')} icon={editingId ? 'check' : 'send'} loading={send.isPending || updateAnn.isPending} disabled={!valid} onPress={publish} />

      <BottomSheet visible={!!toDelete} onClose={() => setToDelete(null)}>
        <Text style={styles.sheetTitle}>{i18n.t('admin.supprimer', { title: toDelete?.title })}</Text>
        <Text style={styles.sheetText}>{i18n.t('admin.lannonce_disparaitra_de_laccueil_des')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={i18n.t('admin.oui_supprimer')} variant="danger" loading={deleteAnn.isPending} onPress={() => toDelete && deleteAnn.mutate(toDelete.id, { onSettled: () => setToDelete(null) })} />
          <Button label={i18n.t('common.annuler')} variant="outline" onPress={() => setToDelete(null)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    addShadow: { borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6 },
    addButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    card: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    cta: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
    item: { padding: 14, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    itemTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 11.5 },
    itemBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 4 },
    audRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    audChip: { height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    audChipOn: { backgroundColor: colors.primary },
    audText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    editNote: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    iconBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    period: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    periodText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk },
    empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 16 },
  });
}
