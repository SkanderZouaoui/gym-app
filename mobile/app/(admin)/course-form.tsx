import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { Banner, BottomSheet, ScreenTitle } from '../../src/components/ui';
import { SelectField } from '../../src/components/ui/SelectField';
import { DateTimeFields } from '../../src/components/ui/DateTimeFields';
import { Button } from '../../src/components/Button';
import { StickyActionBar, STICKY_BAR_SPACE } from '../../src/components/ui/StickyActionBar';
import { useSession } from '../../src/hooks/useClasses';
import {
  useAdminCoaches,
  useAdminRooms,
  useAllClassTypes,
  useDeleteSession,
  useSaveClassType,
  useSaveRoom,
  useSaveSession,
} from '../../src/hooks/useAdmin';
import { ApiError } from '../../src/api/client';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../src/i18n';
import { ClassTypeMediaSection } from '../../src/components/ClassTypeMediaSection';

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

/** Création / édition d'un cours : type, date et heure, coach, salle, capacité. */
export default function CourseFormScreen() {
  useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: session } = useSession(id);
  const { data: types } = useAllClassTypes();
  const { data: coaches } = useAdminCoaches();
  const { data: rooms } = useAdminRooms();
  const save = useSaveSession();
  const remove = useDeleteSession();
  const saveType = useSaveClassType();
  const saveRoom = useSaveRoom();

  const [typeId, setTypeId] = useState<string | null>(null);
  const [start, setStart] = useState<Date>(defaultStart);
  const [duration, setDuration] = useState(45);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(16);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const activeTypes = (types ?? []).filter((t) => t.isActive || t.id === typeId);

  useEffect(() => {
    if (!session || hydrated) return;
    setTypeId(session.classType.id);
    setStart(new Date(session.startsAt));
    setDuration(Math.round((new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000));
    setCoachId(session.coachId ?? null);
    setRoomId(session.roomId ?? null);
    setCapacity(session.capacity);
    setHydrated(true);
  }, [session, hydrated]);

  const pickType = (value: string | null) => {
    setTypeId(value);
    const t = (types ?? []).find((x) => x.id === value);
    if (t && !editing) {
      setCapacity(t.defaultCapacity);
      setDuration(t.defaultDurationMin);
    }
  };

  const valid = !!typeId && capacity >= 1 && duration >= 5;
  const end = new Date(start.getTime() + duration * 60000);
  const clock = (d: Date) => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  const typeName = (types ?? []).find((t) => t.id === typeId)?.name;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/planning'));

  const submit = () => {
    if (!typeId) return;
    setError(null);
    save.mutate(
      { id, classTypeId: typeId, startsAt: start.toISOString(), durationMin: duration, coachId, roomId, capacity },
      {
        onSuccess: goBack,
        onError: (e) =>
          setError(
            e instanceof ApiError && e.code === 'CAPACITY_BELOW_BOOKINGS'
              ? i18n.t('admin.la_capacite_ne_peut_pas')
              : i18n.t('admin.impossible_denregistrer_le_cours_verifiez'),
          ),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: STICKY_BAR_SPACE + 30 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{i18n.t('common.planning')}</Text>
        </Pressable>
        <ScreenTitle title={editing ? i18n.t('admin.modifier_le_cours') : i18n.t('admin.nouveau_cours')} subtitle={i18n.t('admin.horaire_coach_salle_et_capacite')} />

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <Text style={styles.heroKicker}>{i18n.t('admin.apercu')}</Text>
            <Text style={styles.heroTitle} numberOfLines={1}>{typeName ?? i18n.t('admin.choisissez_un_type_de_cours')}</Text>
            <Text style={styles.heroSub}>
              {start.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} · {clock(start)} – {clock(end)}
            </Text>
            <Text style={styles.heroSub}>{i18n.t('admin.places_min', { capacity, duration })}</Text>
          </LinearGradient>
        </View>

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <Text style={styles.section}>{i18n.t('common.cours_2')}</Text>
        <SelectField
          label={i18n.t('admin.type_de_cours')}
          icon="fitness-center"
          placeholder={i18n.t('admin.choisir_un_type')}
          value={typeId}
          options={activeTypes.map((t) => ({ value: t.id, label: t.name, sub: i18n.t('admin.min_places', { defaultDurationMin: t.defaultDurationMin, defaultCapacity: t.defaultCapacity }) }))}
          onChange={pickType}
          create={{
            label: i18n.t('admin.nouveau_type_de_cours'),
            placeholder: i18n.t('admin.ex_cross_training'),
            extra: { label: i18n.t('admin.capacite'), unit: 'places', defaultValue: 16 },
            submit: async (name, cap) => (await saveType.mutateAsync({ name, defaultCapacity: cap || 16 })).id,
          }}
        />

        {typeId ? <ClassTypeMediaSection typeId={typeId} /> : null}

        <Text style={styles.section}>{i18n.t('admin.horaire')}</Text>
        <DateTimeFields value={start} onChange={setStart} minimumDate={editing ? undefined : new Date()} />
        <View style={[styles.stepCard, cardShadow]}>
          <View>
            <Text style={styles.stepValue}>{duration} <Text style={styles.stepUnit}>{i18n.t('admin.min')}</Text></Text>
            <Text style={styles.stepSub}>{i18n.t('admin.duree_fin_a', { v1: clock(end) })}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityLabel={i18n.t('admin.moins')} style={styles.minus} onPress={() => setDuration((d) => Math.max(15, d - 5))}>
              <MaterialIcons name="remove" size={24} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel={i18n.t('common.plus')} onPress={() => setDuration((d) => Math.min(240, d + 5))}>
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} style={styles.plus}>
                <MaterialIcons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>{i18n.t('admin.encadrement')}</Text>
        <SelectField
          label={i18n.t('common.coach')}
          icon="sports"
          placeholder={i18n.t('common.sans_coach')}
          value={coachId}
          options={[{ value: null, label: i18n.t('common.sans_coach') }, ...(coaches ?? []).map((c) => ({ value: c.userId, label: `${c.user.firstName} ${c.user.lastName}` }))]}
          onChange={setCoachId}
        />
        <SelectField
          label={i18n.t('common.salle')}
          icon="meeting-room"
          placeholder={i18n.t('admin.aucune_salle')}
          value={roomId}
          options={[{ value: null, label: i18n.t('admin.aucune_salle') }, ...(rooms ?? []).map((r) => ({ value: r.id, label: r.name, sub: `${r.capacity} places` }))]}
          onChange={setRoomId}
          create={{
            label: i18n.t('admin.nouvelle_salle'),
            placeholder: i18n.t('admin.ex_studio_b'),
            extra: { label: i18n.t('admin.capacite'), unit: 'places', defaultValue: 20 },
            submit: async (name, cap) => {
              const room = await saveRoom.mutateAsync({ name, capacity: cap || 20 });
              if (!editing) setCapacity((c) => Math.min(c, room.capacity));
              return room.id;
            },
          }}
        />

        <Text style={styles.section}>{i18n.t('admin.capacite')}</Text>
        <View style={[styles.stepCard, cardShadow]}>
          <View>
            <Text style={styles.stepValue}>{capacity}</Text>
            <Text style={styles.stepSub}>{i18n.t('admin.places_disponibles')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityLabel={i18n.t('admin.moins')} style={styles.minus} onPress={() => setCapacity((c) => Math.max(1, c - 1))}>
              <MaterialIcons name="remove" size={24} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel={i18n.t('common.plus')} onPress={() => setCapacity((c) => c + 1)}>
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} style={styles.plus}>
                <MaterialIcons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {editing ? (
          <Pressable onPress={() => setConfirmDelete(true)} style={styles.deleteBtn}>
            <MaterialIcons name="delete" size={22} color={colors.dangerInk} />
            <Text style={styles.deleteText}>{i18n.t('admin.supprimer_le_cours')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <StickyActionBar visible={!editing || hydrated} label={editing ? i18n.t('member.enregistrer') : i18n.t('admin.creer_le_cours')} loading={save.isPending} disabled={!valid} onPress={submit} />

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={styles.sheetTitle}>{i18n.t('admin.supprimer_ce_cours')}</Text>
        <Text style={styles.sheetText}>{i18n.t('admin.sil_y_a_des_inscrits')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={i18n.t('admin.oui_supprimer')}
            variant="secondary"
            loading={remove.isPending}
            onPress={() => id && remove.mutate(id, { onSuccess: () => { setConfirmDelete(false); goBack(); } })}
          />
          <Button label={i18n.t('common.annuler')} variant="outline" onPress={() => setConfirmDelete(false)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 10, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    heroShadow: { borderRadius: 26, shadowColor: colors.primary, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 7 },
    hero: { borderRadius: 26, padding: 20, overflow: 'hidden', gap: 2 },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroKicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.85)' },
    heroTitle: { fontFamily: fonts.head, fontSize: 26, letterSpacing: -0.8, color: '#FFFFFF', marginTop: 2 },
    heroSub: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: 'rgba(255,255,255,0.92)', textTransform: 'capitalize' },
    section: { fontFamily: fonts.head, fontSize: 16, letterSpacing: -0.3, color: colors.text, marginTop: 10 },
    stepCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14,
      backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border,
    },
    stepValue: { fontFamily: fonts.head, fontSize: 32, letterSpacing: -1.2, color: colors.text, lineHeight: 36 },
    stepUnit: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.muted, letterSpacing: 0 },
    stepSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    minus: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    plus: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    ctaShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginTop: 14 },
    cta: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    deleteBtn: {
      minHeight: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.border,
    },
    deleteText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.dangerInk },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  });
}
