import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { TextField } from '../../src/components/TextField';
import { Banner, BottomSheet, ScreenTitle } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { StickyActionBar, STICKY_BAR_SPACE } from '../../src/components/ui/StickyActionBar';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useAnnouncements, useDeleteAnnouncement, useSendAnnouncement, useUpdateAnnouncement, type Announcement } from '../../src/hooks/useAdmin';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fr = (s: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '…');

function status(a: Announcement): 'Programmée' | 'Publiée' | 'Terminée' {
  const today = iso(new Date());
  if (a.startsOn && a.startsOn.slice(0, 10) > today) return 'Programmée';
  if (a.endsOn && a.endsOn.slice(0, 10) < today) return 'Terminée';
  return 'Publiée';
}

/** Annonces (admin) : message sur l'accueil adhérent pendant une période, avec push facultatif. */
export default function AdminAnnouncementsScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: announcements, refetch } = useAnnouncements();
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
            setDone('Annonce modifiée.');
            setOpen(false);
            resetForm();
          },
          onError: () => setError('La modification a échoué. Réessayez.'),
        },
      );
      return;
    }
    send.mutate(
      { title: title.trim(), body: body.trim(), startsOn, endsOn: endsOn || undefined, push },
      {
        onSuccess: (r) => {
          setDone(push ? `Publiée et envoyée en push à ${r.recipientCount} adhérent(s).` : 'Annonce publiée.');
          setOpen(false);
          resetForm();
        },
        onError: () => setError('L’annonce n’a pas pu être publiée. Réessayez.'),
      },
    );
  };

  const tag = (s: ReturnType<typeof status>) =>
    s === 'Publiée' ? { bg: colors.successSoft, fg: colors.successInk } : s === 'Programmée' ? { bg: colors.warningSoft, fg: colors.warningInk } : { bg: colors.surface2, fg: colors.muted };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, open && { paddingBottom: STICKY_BAR_SPACE + 30 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle
          title="Annonces"
          subtitle="Push + écran d’accueil adhérent"
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
            <TextField label="Titre" value={title} onChangeText={setTitle} placeholder="Ex. Fermeture exceptionnelle" />
            <TextField label="Message" value={body} onChangeText={setBody} placeholder="Votre message aux adhérents" multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <TextField label="Début" value={startsOn} onChangeText={setStartsOn} placeholder="AAAA-MM-JJ" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Fin (facultatif)" value={endsOn} onChangeText={setEndsOn} placeholder="AAAA-MM-JJ" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} />
              </View>
            </View>
            {!editingId ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Envoyer une notification push</Text>
              <Switch value={push} onValueChange={setPush} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
            </View>
            ) : (
              <Text style={styles.editNote}>Les notifications déjà envoyées ne sont pas modifiées.</Text>
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
                    <Text style={[styles.tagText, { color: t.fg }]}>{st}</Text>
                  </View>
                </View>
                <Text style={styles.itemBody} numberOfLines={3}>{a.body}</Text>
                <View style={styles.period}>
                  <MaterialIcons name="event" size={16} color={colors.primaryInk} />
                  <Text style={[styles.periodText, { flex: 1 }]}>{fr(a.startsOn)} → {fr(a.endsOn)}{a.push ? ' · push envoyé' : ''}</Text>
                  <Pressable accessibilityLabel="Modifier l'annonce" onPress={() => startEdit(a)} style={styles.iconBtn} hitSlop={6}>
                    <MaterialIcons name="edit" size={18} color={colors.primaryInk} />
                  </Pressable>
                  <Pressable accessibilityLabel="Supprimer l'annonce" onPress={() => setToDelete(a)} style={[styles.iconBtn, { backgroundColor: colors.dangerSoft }]} hitSlop={6}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.dangerInk} />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {(announcements ?? []).length === 0 ? <Text style={styles.empty}>Aucune annonce pour le moment.</Text> : null}
        </View>
      </ScrollView>
      <StickyActionBar visible={open} label={editingId ? 'Enregistrer les modifications' : 'Publier'} icon={editingId ? 'check' : 'send'} loading={send.isPending || updateAnn.isPending} disabled={!valid} onPress={publish} />

      <BottomSheet visible={!!toDelete} onClose={() => setToDelete(null)}>
        <Text style={styles.sheetTitle}>Supprimer « {toDelete?.title} » ?</Text>
        <Text style={styles.sheetText}>L’annonce disparaîtra de l’accueil des adhérents. Les notifications déjà envoyées restent dans leur historique.</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Oui, supprimer" variant="danger" loading={deleteAnn.isPending} onPress={() => toDelete && deleteAnn.mutate(toDelete.id, { onSettled: () => setToDelete(null) })} />
          <Button label="Annuler" variant="outline" onPress={() => setToDelete(null)} />
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
    editNote: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    iconBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    period: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    periodText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk },
    empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 16 },
  });
}
