import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '../components/ScreenHeader';
import { fonts, radii, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useManualCheckin, useSessionRoster, type RosterEntry } from '../hooks/useCoachSessions';
import { useSession } from '../hooks/useClasses';
import { Avatar, DetailSkeleton, EmptyState, ProgressBar } from '../components/ui';
import { StatusTag } from '../components/staff/staffUi';
import { useOfflineAwareRefresh } from '../hooks/useOfflineAwareRefresh';
import { dateLocale } from '../i18n';
import { levelLabel } from '../i18n/labels';
import { useNow } from '../hooks/useNow';
import { ImageGallery } from './adherent/ImageGallery';

type Filter = 'all' | 'present' | 'todo';

interface Props {
  /** Écran vers lequel revenir si la pile de navigation est vide. */
  fallbackHref: string;
  /** Écran de scan du rôle (reçoit `sessionId`) : bouton « Scanner » de la carte de présence. */
  scannerRoute: string;
  /** Profil d'un adhérent du rôle (route avec `[id]`) : ouvert par un appui sur une ligne de la liste des inscrits. */
  memberRoute: string;
}

/** Détail d'un cours (coach, accueil) : infos du cours, présence, inscrits avec leur formule et pointage, liste d'attente. */
export function SessionDetailScreen({ fallbackHref, scannerRoute, memberRoute }: Props) {
  const nowMs = useNow();
  const client = useQueryClient();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => client.invalidateQueries());
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession(id);
  const { data: roster, isLoading } = useSessionRoster(id);
  const checkin = useManualCheckin();
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);


  if (isLoading || !session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const state = end.getTime() < nowMs ? 'done' : start.getTime() <= nowMs ? 'live' : 'upcoming';
  const tag = state === 'done' ? { label: t('common.termine'), tone: 'muted' as const } : state === 'live' ? { label: t('common.en_cours'), tone: 'success' as const } : { label: t('coach.detail_upcoming'), tone: 'warning' as const };
  const fmt = (d: Date) => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  const dateLabel = start.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

  const confirmed = (roster ?? []).filter((r) => r.status === 'CONFIRMED' || r.status === 'ATTENDED');
  const waitlisted = (roster ?? []).filter((r) => r.status === 'WAITLISTED');
  const attendedCount = confirmed.filter((r) => r.status === 'ATTENDED').length;
  const left = Math.max(0, session.capacity - confirmed.length);
  const shown = confirmed
    .filter((r) => (filter === 'present' ? r.status === 'ATTENDED' : filter === 'todo' ? r.status !== 'ATTENDED' : true))
    .sort((a, b) => Number(a.status === 'ATTENDED') - Number(b.status === 'ATTENDED') || a.user.firstName.localeCompare(b.user.firstName));

  const doCheckin = (entry: RosterEntry) => {
    setPendingId(entry.id);
    checkin.mutate({ sessionId: session.id, userId: entry.user.id }, { onSettled: () => setPendingId(null) });
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t('common.tous'), count: confirmed.length },
    { key: 'todo', label: t('coach.detail_to_check'), count: confirmed.length - attendedCount },
    { key: 'present', label: t('common.present'), count: attendedCount },
  ];

  const infos: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }[] = [
    { icon: 'schedule', label: t('coach.detail_hours'), value: `${fmt(start)} – ${fmt(end)}` },
    { icon: 'timelapse', label: t('coach.detail_duration'), value: t('staff.min', { minutes }) },
    { icon: 'meeting-room', label: t('coach.detail_room'), value: session.room?.name ?? '—' },
    { icon: 'event-seat', label: t('coach.detail_spots'), value: t('coach.detail_spots_value', { left, capacity: session.capacity }) },
  ];

  const row = (entry: RosterEntry, waitlist = false) => {
    const u = entry.user;
    const attended = entry.status === 'ATTENDED';
    const plan = u.memberships?.[0]?.plan.name;
    return (
      <Pressable
        key={entry.id}
        onPress={() => router.push({ pathname: memberRoute, params: { id: u.id } } as never)}
        accessibilityRole="button"
        accessibilityLabel={`${u.firstName} ${u.lastName}`}
        style={({ pressed }) => [styles.person, cardShadow, attended && { borderColor: colors.successSoft }, pressed && { opacity: 0.85 }]}
      >
        <Avatar initials={`${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase()} size={46} background={attended ? colors.successSoft : colors.primarySoft} color={attended ? colors.successInk : colors.primaryInk} photoUrl={u.photoUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.personName} numberOfLines={1}>{u.firstName} {u.lastName}</Text>
          <View style={styles.personMeta}>
            {plan ? <Text style={styles.metaText} numberOfLines={1}>{plan}</Text> : null}
            {u.memberCode ? <Text style={styles.codeBadge}>#{u.memberCode}</Text> : null}
          </View>
          {waitlist && entry.waitlistPosition ? <Text style={styles.waitlist}>{t('common.liste_dattente_e', { waitlistPosition: entry.waitlistPosition })}</Text> : null}
          {attended && entry.checkInMethod ? (
            <Text style={styles.metaText}>{t(entry.checkInMethod === 'QR' ? 'coach.detail_via_qr' : 'coach.detail_via_manual')}</Text>
          ) : null}
        </View>
        {attended ? (
          <View style={styles.presentPill}>
            <MaterialIcons name="check-circle" size={16} color={colors.successInk} />
            <Text style={styles.presentText}>{t('common.present')}</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => doCheckin(entry)}
            disabled={checkin.isPending}
            accessibilityLabel={t('coach.detail_check_in')}
            style={({ pressed }) => [styles.checkBtn, pressed && { transform: [{ scale: 0.94 }] }, pendingId === entry.id && { opacity: 0.5 }]}
          >
            <MaterialIcons name="how-to-reg" size={20} color={colors.primaryContrast} />
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('coach.detail_title')} fallbackHref={fallbackHref} />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroTop}>
              <Text style={styles.heroKicker}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</Text>
              <StatusTag label={tag.label} tone={tag.tone} />
            </View>
            <Text style={styles.heroName} numberOfLines={2}>{session.classType.name}</Text>
            {session.classType.level ? <Text style={styles.heroLevel}>{levelLabel(session.classType.level)}</Text> : null}
          </LinearGradient>
        </View>

        <View style={styles.infoGrid}>
          {infos.map((i) => (
            <View key={i.label} style={[styles.infoCard, cardShadow]}>
              <View style={styles.infoIcon}>
                <MaterialIcons name={i.icon} size={20} color={colors.primaryInk} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.infoLabel}>{i.label}</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{i.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {session.classType.description ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.cardTitle}>{t('coach.detail_about')}</Text>
            <Text style={styles.description}>{session.classType.description}</Text>
          </View>
        ) : null}

        {session.room?.galleryUrls && session.room.galleryUrls.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.section}>{t('common.salle')} · {session.room.name}</Text>
            <ImageGallery urls={session.room.galleryUrls} />
          </View>
        ) : null}

        {session.classType.galleryUrls && session.classType.galleryUrls.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.section}>{t('member.galerie')}</Text>
            <ImageGallery urls={session.classType.galleryUrls} />
          </View>
        ) : null}

        <View style={[styles.card, cardShadow]}>
          <View style={styles.presRow}>
            <Text style={styles.cardTitle}>{t('coach.presents')}</Text>
            <Text style={styles.presValue}>{attendedCount}<Text style={styles.presTotal}>/{confirmed.length}</Text></Text>
          </View>
          <ProgressBar progress={confirmed.length ? attendedCount / confirmed.length : 0} color={colors.success} />
          <Pressable
            onPress={() => router.push({ pathname: scannerRoute, params: { sessionId: session.id } } as never)}
            style={({ pressed }) => [styles.scanBtn, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <MaterialIcons name="qr-code-scanner" size={22} color={colors.primaryContrast} />
            <Text style={styles.scanText}>{t('coach.home_scan')}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.section}>{t('coach.inscrits_3')}</Text>
          <Text style={styles.sectionCount}>{confirmed.length}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {filters.map((f) => {
            const on = f.key === filter;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && { color: colors.primaryContrast }]}>{f.label}</Text>
                <View style={[styles.chipCount, on && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Text style={[styles.chipCountText, on && { color: colors.primaryContrast }]}>{f.count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {confirmed.length === 0 ? (
          <EmptyState icon="group-off" title={t('coach.aucun_inscrit')} text={t('coach.personne_nest_encore_reserve_pour')} tone="muted" />
        ) : shown.length === 0 ? (
          <Text style={styles.noMatch}>{t('coach.detail_no_match')}</Text>
        ) : (
          <View style={{ gap: 10 }}>{shown.map((e) => row(e))}</View>
        )}

        {waitlisted.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.section}>{t('common.liste_dattente')}</Text>
              <Text style={styles.sectionCount}>{waitlisted.length}</Text>
            </View>
            <View style={{ gap: 10 }}>{waitlisted.map((e) => row(e, true))}</View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 4, gap: 12, paddingBottom: 80 },
    heroShadow: { borderRadius: 28, shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 7 },
    hero: { borderRadius: 28, padding: 20, overflow: 'hidden', gap: 6 },
    heroDecor: { position: 'absolute', end: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    heroKicker: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.92)' },
    heroName: { fontFamily: fonts.head, fontSize: 32, lineHeight: 36, letterSpacing: -1.2, color: '#fff', marginTop: 4 },
    heroLevel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoCard: { width: '48.4%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    infoLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    infoValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginTop: 1 },
    card: { padding: 16, gap: 10, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
    presRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    presValue: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.8, color: colors.successInk },
    presTotal: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.muted },
    scanBtn: { marginTop: 4, height: 50, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary },
    scanText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    section: { fontFamily: fonts.head, fontSize: 19, letterSpacing: -0.4, color: colors.text },
    sectionCount: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, paddingStart: 14, paddingEnd: 8, borderRadius: 19, backgroundColor: colors.primarySoft },
    chipOn: { backgroundColor: colors.primary },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    chipCount: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    chipCountText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primaryInk },
    noMatch: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
    person: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    personName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    personMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    metaText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, flexShrink: 1 },
    codeBadge: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.primaryInk },
    waitlist: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.warningInk, marginTop: 2 },
    presentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.successSoft },
    presentText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.successInk },
    checkBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  });
}
