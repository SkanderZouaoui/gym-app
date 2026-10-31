import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { TextField } from '../../src/components/TextField';
import { Banner, BottomSheet, ScreenTitle, SkeletonList } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { ResetPasswordButton } from '../../src/components/ResetPasswordButton';
import { TimeButton } from '../../src/components/ui/DateTimeFields';
import { InitialsAvatar, StatusTag } from '../../src/components/staff/staffUi';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useCoachDetails, useCreateTeamMember, useDeleteTeamMember, resetTeamPassword, useSaveWorkSchedule, useTeam, useTeamStats, useUpdateTeamMember, useWorkSchedule, shiftHours, WEEK_DAYS, type TeamMember, type WorkDay } from '../../src/hooks/useAdmin';
import { ApiError } from '../../src/api/client';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../src/i18n';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Équipe (admin) : comptes accueil et coachs, créés et gérés par l'admin — FitZone Mobile Admin v2. */
export default function AdminTeamScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: team, refetch, isLoading } = useTeam();
  const create = useCreateTeamMember();
  const update = useUpdateTeamMember();
  const remove = useDeleteTeamMember();
  const [detail, setDetail] = useState<TeamMember | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [draft, setDraft] = useState<WorkDay[] | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const { data: schedule } = useWorkSchedule(detail?.id);
  const saveSchedule = useSaveWorkSchedule();
  const [statsOpen, setStatsOpen] = useState(false);
  const [period, setPeriod] = useState(30);
  const { data: stats, isLoading: statsLoading } = useTeamStats(statsOpen ? detail?.id : undefined, period);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: coachInfo } = useCoachDetails(detail && detail.roles.some((r) => r.role === 'COACH') ? detail.id : undefined);
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [formOpen, setFormOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'STAFF' | 'COACH'>('STAFF');
  const [filter, setFilter] = useState<'ALL' | 'STAFF' | 'COACH'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; email: string; password: string; role: 'STAFF' | 'COACH' } | null>(null);
  const [copied, setCopied] = useState(false);

  const hasRole = (u: { roles: { role: string }[] }, r: string) => u.roles.some((x) => x.role === r);
  const all = (team ?? []).filter((u) => hasRole(u, 'STAFF') || hasRole(u, 'COACH'));
  const staff = all.filter((u) => filter === 'ALL' || hasRole(u, filter));
  const counts = { ALL: all.length, STAFF: all.filter((u) => hasRole(u, 'STAFF')).length, COACH: all.filter((u) => hasRole(u, 'COACH')).length };
  const roleLabel = (r: 'STAFF' | 'COACH') => (r === 'COACH' ? t('common.coach') : t('common.accueil'));
  const valid = firstName.trim() && lastName.trim() && /\S+@\S+\.\S+/.test(email);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setError(null);
  };

  const submit = () => {
    setError(null);
    const password = generatePassword();
    create.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() || undefined, password, role },
      {
        onSuccess: (u) => {
          setCreated({ name: `${u.firstName} ${u.lastName}`, email: email.trim(), password, role });
          setFormOpen(false);
          reset();
        },
        onError: (e) =>
          setError(
            e instanceof ApiError && e.code === 'EMAIL_ALREADY_USED'
              ? t('admin.cette_adresse_e_mail_est')
              : e instanceof ApiError && e.code === 'PHONE_ALREADY_USED'
                ? t('common.ce_numero_de_telephone_est')
                : t('admin.impossible_de_creer_le_compte'),
          ),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.plus')}</Text>
        </Pressable>
        <ScreenTitle
          title={t('admin.equipe')}
          subtitle={t('admin.accueil_et_coachs_comptes_geres')}
          right={
            <Pressable
              accessibilityLabel={t('common.creer_un_compte')}
              onPress={() => setFormOpen(true)}
              style={({ pressed }) => [styles.addShadow, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
                <MaterialIcons name="add" size={28} color={colors.primaryContrast} />
              </LinearGradient>
            </Pressable>
          }
        />

        <View style={styles.filterRow}>
          {(['ALL', 'STAFF', 'COACH'] as const).map((k) => (
            <Pressable key={k} onPress={() => setFilter(k)} style={[styles.filterChip, filter === k && styles.filterChipOn]}>
              <Text style={[styles.filterText, filter === k && { color: colors.primaryContrast }]}>{t(`admin.team_filter_${k}`)} · {counts[k]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          {staff.map((u) => {
            const active = u.status === 'ACTIVE';
            return (
              <View key={u.id} style={[styles.card, cardShadow, !active && { opacity: 0.65 }]}>
                <Pressable style={styles.row} onPress={() => { setDetail(u); setDeleteError(null); }}>
                  <InitialsAvatar first={u.firstName} last={u.lastName} photoUrl={u.photoUrl} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{u.firstName} {u.lastName}</Text>
                    <View style={styles.inlineMeta}><MaterialIcons name={hasRole(u, 'COACH') ? 'sports-gymnastics' : 'badge'} size={14} color={colors.primaryInk} /><Text style={styles.meta} numberOfLines={1}>{hasRole(u, 'COACH') ? t('common.coach') : t('common.accueil')} · {u.email ?? u.phone ?? '—'}</Text></View>
                  </View>
                  <StatusTag label={active ? t('home.statusActive') : t('staff.suspendu')} tone={active ? 'success' : 'muted'} />
                  <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
                </Pressable>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{t('common.compte_actif')}</Text>
                  <Switch
                    value={active}
                    onValueChange={(v) => update.mutate({ id: u.id, status: v ? 'ACTIVE' : 'SUSPENDED' })}
                    trackColor={{ true: colors.primary, false: colors.surface2 }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.surface2}
                  />
                </View>
              </View>
            );
          })}
          {isLoading ? <SkeletonList count={5} /> : staff.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="badge" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>{t('admin.aucun_compte_pour_le_moment')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet visible={!!detail && !confirmDelete && !statsOpen && !scheduleOpen} onClose={() => setDetail(null)}>
        {detail ? (
          <View style={{ gap: 12 }}>
            <View style={styles.detailHead}>
              <InitialsAvatar first={detail.firstName} last={detail.lastName} photoUrl={detail.photoUrl} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{detail.firstName} {detail.lastName}</Text>
                <View style={styles.inlineMeta}>
                  <MaterialIcons name={hasRole(detail, 'COACH') ? 'sports-gymnastics' : 'badge'} size={14} color={colors.primaryInk} />
                  <Text style={styles.meta}>{hasRole(detail, 'COACH') ? t('common.coach') : t('common.accueil')}</Text>
                </View>
              </View>
              <StatusTag label={detail.status === 'ACTIVE' ? t('home.statusActive') : t('staff.suspendu')} tone={detail.status === 'ACTIVE' ? 'success' : 'muted'} />
            </View>
            <View style={styles.detailBox}>
              {[
                { icon: 'mail-outline' as const, k: t('common.e_mail'), v: detail.email ?? '—' },
                { icon: 'call' as const, k: t('common.telephone'), v: detail.phone ?? '—' },
                { icon: 'event' as const, k: t('admin.compte_cree_le'), v: new Date(detail.createdAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) },
                ...(hasRole(detail, 'COACH') && coachInfo?.specialties?.length ? [{ icon: 'fitness-center' as const, k: t('common.specialites'), v: coachInfo.specialties.join(', ') }] : []),
                ...(hasRole(detail, 'COACH') && coachInfo?.yearsExperience != null ? [{ icon: 'workspace-premium' as const, k: t('admin.experience'), v: `${coachInfo.yearsExperience} an${coachInfo.yearsExperience > 1 ? 's' : ''}` }] : []),
                ...(hasRole(detail, 'COACH') && coachInfo?.bio ? [{ icon: 'notes' as const, k: t('admin.presentation'), v: coachInfo.bio }] : []),
              ].map((r, i, arr) => (
                <View key={r.k} style={[styles.detailRow, i < arr.length - 1 && styles.detailRowBorder]}>
                  <MaterialIcons name={r.icon} size={20} color={colors.primaryInk} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.detailKey}>{r.k}</Text>
                    <Text style={styles.detailValue}>{r.v}</Text>
                  </View>
                </View>
              ))}
            </View>
            {deleteError ? <Banner tone="danger" icon="error" text={deleteError} /> : null}
            <Pressable style={styles.scheduleRow} onPress={() => { setDraft(schedule ?? null); setScheduleError(null); setScheduleOpen(true); }}>
              <MaterialIcons name="calendar-month" size={22} color={colors.primaryInk} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailValue}>{t('admin.planning_de_travail')}</Text>
                <Text style={styles.detailKey}>
                  {schedule && schedule.some((d) => d.working)
                    ? t('admin.jours_h_semaine', { length: schedule.filter((d) => d.working).length, v1: Math.round(schedule.reduce((s2, d) => s2 + shiftHours(d), 0) * 10) / 10 })
                    : t('admin.non_defini')}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
            <Button label={t('admin.plus_dinformations')} onPress={() => setStatsOpen(true)} />
            <ResetPasswordButton name={`${detail.firstName} ${detail.lastName}`} email={detail.email} reset={() => resetTeamPassword(detail.id)} />
            <Button label={t('admin.supprimer_ce_compte')} variant="outline" onPress={() => setConfirmDelete(true)} />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={scheduleOpen && !!detail} onClose={() => setScheduleOpen(false)}>
        {detail ? (
          <View style={{ gap: 10 }}>
            <View style={styles.detailHead}>
              <Pressable onPress={() => setScheduleOpen(false)} hitSlop={8} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{t('admin.planning_2', { firstName: detail.firstName, lastName: detail.lastName })}</Text>
                <Text style={styles.meta}>{t('admin.semaine_type_repetee_chaque_semaine')}</Text>
              </View>
            </View>
            {scheduleError ? <Banner tone="danger" icon="error" text={scheduleError} /> : null}
            {(draft ?? []).map((d) => (
              <View key={d.dayOfWeek} style={styles.shiftRow}>
                <View style={{ width: 84 }}>
                  <Text style={styles.detailValue}>{WEEK_DAYS[d.dayOfWeek]}</Text>
                  <Text style={[styles.detailKey, { color: d.working ? colors.successInk : colors.muted }]}>{d.working ? `${shiftHours(d)} h` : t('admin.repos')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TimeButton value={d.startTime} disabled={!d.working} onChange={(v) => setDraft((cur) => cur && cur.map((x) => (x.dayOfWeek === d.dayOfWeek ? { ...x, startTime: v } : x)))} />
                </View>
                <Text style={styles.detailKey}>–</Text>
                <View style={{ flex: 1 }}>
                  <TimeButton value={d.endTime} disabled={!d.working} onChange={(v) => setDraft((cur) => cur && cur.map((x) => (x.dayOfWeek === d.dayOfWeek ? { ...x, endTime: v } : x)))} />
                </View>
                <Switch
                  value={d.working}
                  onValueChange={(v) => setDraft((cur) => cur && cur.map((x) => (x.dayOfWeek === d.dayOfWeek ? { ...x, working: v } : x)))}
                  trackColor={{ true: colors.primary, false: colors.surface2 }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.surface2}
                />
              </View>
            ))}
            <Pressable
              style={styles.copyChip}
              onPress={() => setDraft((cur) => cur && cur.map((x) => (x.dayOfWeek >= 1 && x.dayOfWeek <= 4 ? { ...cur[0], dayOfWeek: x.dayOfWeek } : x)))}
            >
              <MaterialIcons name="content-copy" size={16} color={colors.primaryInk} />
              <Text style={styles.copyChipText}>{t('admin.copier_le_lundi_sur_mardi_2')}</Text>
            </Pressable>
            <Button
              label={saveSchedule.isPending ? t('common.enregistrement') : t('admin.enregistrer_le_planning')}
              disabled={!draft || saveSchedule.isPending}
              onPress={() =>
                detail &&
                draft &&
                saveSchedule.mutate(
                  { id: detail.id, days: draft },
                  {
                    onSuccess: () => setScheduleOpen(false),
                    onError: (e) => setScheduleError(e instanceof ApiError && e.code === 'SHIFT_END_BEFORE_START' ? t('admin.lheure_de_fin_doit_etre') : t('admin.enregistrement_impossible_reessayez')),
                  },
                )
              }
            />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={statsOpen && !!detail} onClose={() => setStatsOpen(false)}>
        {detail ? (
          <View style={{ gap: 12 }}>
            <View style={styles.detailHead}>
              <Pressable onPress={() => setStatsOpen(false)} hitSlop={8} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{t('admin.activite_2', { firstName: detail.firstName, lastName: detail.lastName })}</Text>
                <Text style={styles.meta}>{hasRole(detail, 'COACH') ? t('common.coach') : t('common.accueil')}</Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {[7, 30, 90].map((d) => (
                <Pressable key={d} onPress={() => setPeriod(d)} style={[styles.filterChip, period === d && styles.filterChipOn]}>
                  <Text style={[styles.filterText, period === d && { color: colors.primaryContrast }]}>{t('admin.jours', { d })}</Text>
                </Pressable>
              ))}
            </View>

            {statsLoading ? <SkeletonList count={3} height={84} /> : null}

            {stats?.staff ? (
              <>
                <Text style={styles.statsGroup}>{t('common.accueil')}</Text>
                <View style={styles.statGrid}>
                  {[
                    { icon: 'qr-code-scanner' as const, v: String(stats.staff.scans), l: t('admin.scans'), sub: t('admin.valides', { scansGranted: stats.staff.scansGranted }) },
                    { icon: 'payments' as const, v: `${Math.round(stats.staff.paymentsTotal).toLocaleString(dateLocale())} DT`, l: t('common.encaisse'), sub: `${stats.staff.payments} encaissement${stats.staff.payments > 1 ? 's' : ''}` },
                    { icon: 'person-add' as const, v: String(stats.staff.accountsCreated), l: t('admin.comptes_crees'), sub: t('admin.adherents_2') },
                    { icon: 'event-available' as const, v: String(stats.staff.daysWorked), l: t('admin.jours_travailles'), sub: t('admin.sur_jours', { period }) },
                    { icon: 'schedule' as const, v: `${stats.staff.hours} h`, l: t('common.heures'), sub: t('admin.h_jour', { avgHoursPerDay: stats.staff.avgHoursPerDay }) },
                  ].map((c) => (
                    <View key={c.l} style={styles.statCell}>
                      <MaterialIcons name={c.icon} size={20} color={colors.primary} />
                      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{c.v}</Text>
                      <Text style={styles.statLabel}>{c.l}</Text>
                      <Text style={styles.statSub}>{c.sub}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.statNote}>{stats.staff.source === 'planning' ? t('admin.jours_et_heures_selon_le') : t('admin.aucun_planning_defini_jours_et')}</Text>
              </>
            ) : null}

            {stats?.coach ? (
              <>
                <Text style={styles.statsGroup}>{t('admin.coaching')}</Text>
                <View style={styles.statGrid}>
                  {[
                    { icon: 'fitness-center' as const, v: String(stats.coach.sessions), l: t('admin.cours_assures'), sub: t('admin.a_venir', { upcoming: stats.coach.upcoming }) },
                    { icon: 'groups' as const, v: String(stats.coach.attendees), l: t('admin.participants'), sub: t('admin.presences_validees') },
                    { icon: 'event-available' as const, v: String(stats.coach.daysWorked), l: t('admin.jours_travailles'), sub: stats.coach.plannedDays != null ? t('admin.prevus_au_planning', { plannedDays: stats.coach.plannedDays }) : t('admin.sur_jours', { period }) },
                    { icon: 'schedule' as const, v: `${stats.coach.hours} h`, l: t('admin.heures_de_cours'), sub: stats.coach.plannedHours != null ? t('admin.h_prevues', { plannedHours: stats.coach.plannedHours }) : `${stats.coach.avgHoursPerDay} h / jour` },
                  ].map((c) => (
                    <View key={c.l} style={styles.statCell}>
                      <MaterialIcons name={c.icon} size={20} color={colors.primary} />
                      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{c.v}</Text>
                      <Text style={styles.statLabel}>{c.l}</Text>
                      <Text style={styles.statSub}>{c.sub}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <Text style={styles.sheetTitle}>{t('admin.supprimer_3', { firstName: detail?.firstName, lastName: detail?.lastName })}</Text>
        <Text style={styles.sheetText}>{t('admin.le_compte_sera_desactive_et', { v1: detail && hasRole(detail, 'COACH') ? t('admin.les_cours_deja_planifies_resteront') : '' })}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={t('admin.oui_supprimer')}
            variant="danger"
            loading={remove.isPending}
            onPress={() =>
              detail &&
              remove.mutate(detail.id, {
                onSuccess: () => {
                  setConfirmDelete(false);
                  setDetail(null);
                },
                onError: (e) => {
                  setConfirmDelete(false);
                  setDeleteError(e instanceof ApiError && e.code === 'CANNOT_DELETE_SELF' ? t('admin.vous_ne_pouvez_pas_supprimer') : t('admin.la_suppression_a_echoue_reessayez'));
                },
              })
            }
          />
          <Button label={t('common.annuler')} variant="outline" onPress={() => setConfirmDelete(false)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={formOpen} onClose={() => setFormOpen(false)}>
        <Text style={styles.sheetTitle}>{t('common.nouveau_compte')}</Text>
        <View style={styles.roleRow}>
          {([['STAFF', 'badge'], ['COACH', 'sports-gymnastics']] as const).map(([k, ic]) => (
            <Pressable key={k} onPress={() => setRole(k)} style={[styles.roleCard, role === k && styles.roleCardOn]}>
              <MaterialIcons name={ic} size={22} color={role === k ? colors.primaryContrast : colors.primaryInk} />
              <Text style={[styles.roleText, role === k && { color: colors.primaryContrast }]}>{t(`admin.role_${k}`)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sheetText}>{t('admin.un_mot_de_passe_provisoire')}</Text>
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}
        <TextField label={t('common.prenom')} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <TextField label={t('common.nom')} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <TextField label={t('common.e_mail')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label={t('common.telephone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('common.optionnel')} />
        <Button label={create.isPending ? t('common.creation') : t('admin.creer_le_compte')} onPress={submit} disabled={!valid || create.isPending} />
      </BottomSheet>

      <BottomSheet visible={!!created} onClose={() => setCreated(null)}>
        <Text style={styles.sheetTitle}>{t('admin.compte_cree', { v1: created ? roleLabel(created.role).toLowerCase() : '', name: created?.name })}</Text>
        <Text style={styles.sheetText}>{t('admin.communiquez_ces_acces_le_mot')}</Text>
        <View style={styles.credBox}>
          <Text style={styles.credLabel}>{t('common.e_mail')}</Text>
          <Text style={styles.credValue}>{created?.email}</Text>
          <Text style={[styles.credLabel, { marginTop: 10 }]}>{t('common.mot_de_passe_provisoire')}</Text>
          <Text style={styles.credPassword} selectable>{created?.password}</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button
            label={copied ? t('common.copie') : t('common.copier_le_mot_de_passe')}
            variant="outline"
            onPress={async () => {
              if (!created) return;
              await Clipboard.setStringAsync(created.password);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          />
          <Button
            label={t('common.partager_les_acces')}
            onPress={() => created && Share.share({ message: t('admin.compte_muscleup_e_mail_mot', { v0: roleLabel(created.role).toLowerCase(), email: created.email, password: created.password }) })}
          />
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
    addShadow: { borderRadius: 18, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 6 },
    addButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    statsGroup: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCell: { width: '47.5%', padding: 12, gap: 2, borderRadius: radii.lg, backgroundColor: colors.surface2 },
    statValue: { fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.8, color: colors.text, marginTop: 4 },
    statLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    statSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    statNote: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: colors.muted },
    scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, backgroundColor: colors.primarySoft },
    shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    copyChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.primarySoft },
    copyChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    detailBox: { backgroundColor: colors.surface2, borderRadius: radii.lg, paddingHorizontal: 14 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    detailKey: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    detailValue: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterChip: { height: 38, paddingHorizontal: 14, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    filterChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    roleRow: { flexDirection: 'row', gap: 10 },
    roleCard: { flex: 1, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
    roleCardOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    roleText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    card: { padding: 14, gap: 12, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    switchLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    credBox: { padding: 14, borderRadius: radii.md, backgroundColor: colors.surface2 },
    credLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
    credValue: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text, marginTop: 2 },
    credPassword: { fontFamily: fonts.head, fontSize: 24, letterSpacing: 2, color: colors.text, marginTop: 2 },
  });
}
