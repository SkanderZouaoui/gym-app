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
import { Banner, BottomSheet, ScreenTitle } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { ResetPasswordButton } from '../../src/components/ResetPasswordButton';
import { TimeButton } from '../../src/components/ui/DateTimeFields';
import { InitialsAvatar, StatusTag } from '../../src/components/staff/staffUi';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { useCoachDetails, useCreateTeamMember, useDeleteTeamMember, resetTeamPassword, useSaveWorkSchedule, useTeam, useTeamStats, useUpdateTeamMember, useWorkSchedule, shiftHours, WEEK_DAYS, type TeamMember, type WorkDay } from '../../src/hooks/useAdmin';
import { ApiError } from '../../src/api/client';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Équipe (admin) : comptes accueil et coachs, créés et gérés par l'admin — FitZone Mobile Admin v2. */
export default function AdminTeamScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: team, refetch } = useTeam();
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
  const roleLabel = (r: 'STAFF' | 'COACH') => (r === 'COACH' ? 'Coach' : 'Accueil');
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
              ? 'Cette adresse e-mail est déjà utilisée par un autre compte.'
              : e instanceof ApiError && e.code === 'PHONE_ALREADY_USED'
                ? 'Ce numéro de téléphone est déjà utilisé par un autre compte.'
                : 'Impossible de créer le compte. Vérifiez les informations.',
          ),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle
          title="Équipe"
          subtitle="Accueil et coachs, comptes gérés par l’admin"
          right={
            <Pressable
              accessibilityLabel="Créer un compte"
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
          {([['ALL', 'Tous'], ['STAFF', 'Accueil'], ['COACH', 'Coachs']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setFilter(k)} style={[styles.filterChip, filter === k && styles.filterChipOn]}>
              <Text style={[styles.filterText, filter === k && { color: colors.primaryContrast }]}>{l} · {counts[k]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          {staff.map((u) => {
            const active = u.status === 'ACTIVE';
            return (
              <View key={u.id} style={[styles.card, cardShadow, !active && { opacity: 0.65 }]}>
                <Pressable style={styles.row} onPress={() => { setDetail(u); setDeleteError(null); }}>
                  <InitialsAvatar first={u.firstName} last={u.lastName} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{u.firstName} {u.lastName}</Text>
                    <View style={styles.inlineMeta}><MaterialIcons name={hasRole(u, 'COACH') ? 'sports-gymnastics' : 'badge'} size={14} color={colors.primaryInk} /><Text style={styles.meta} numberOfLines={1}>{hasRole(u, 'COACH') ? 'Coach' : 'Accueil'} · {u.email ?? u.phone ?? '—'}</Text></View>
                  </View>
                  <StatusTag label={active ? 'Actif' : 'Suspendu'} tone={active ? 'success' : 'muted'} />
                  <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
                </Pressable>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Compte actif</Text>
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
          {staff.length === 0 ? (
            <View style={[styles.empty, cardShadow]}>
              <MaterialIcons name="badge" size={34} color={colors.primaryInk} />
              <Text style={styles.emptyText}>Aucun compte pour le moment. Créez le premier avec le bouton +.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet visible={!!detail && !confirmDelete && !statsOpen && !scheduleOpen} onClose={() => setDetail(null)}>
        {detail ? (
          <View style={{ gap: 12 }}>
            <View style={styles.detailHead}>
              <InitialsAvatar first={detail.firstName} last={detail.lastName} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{detail.firstName} {detail.lastName}</Text>
                <View style={styles.inlineMeta}>
                  <MaterialIcons name={hasRole(detail, 'COACH') ? 'sports-gymnastics' : 'badge'} size={14} color={colors.primaryInk} />
                  <Text style={styles.meta}>{hasRole(detail, 'COACH') ? 'Coach' : 'Accueil'}</Text>
                </View>
              </View>
              <StatusTag label={detail.status === 'ACTIVE' ? 'Actif' : 'Suspendu'} tone={detail.status === 'ACTIVE' ? 'success' : 'muted'} />
            </View>
            <View style={styles.detailBox}>
              {[
                { icon: 'mail-outline' as const, k: 'E-mail', v: detail.email ?? '—' },
                { icon: 'call' as const, k: 'Téléphone', v: detail.phone ?? '—' },
                { icon: 'event' as const, k: 'Compte créé le', v: new Date(detail.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ...(hasRole(detail, 'COACH') && coachInfo?.specialties?.length ? [{ icon: 'fitness-center' as const, k: 'Spécialités', v: coachInfo.specialties.join(', ') }] : []),
                ...(hasRole(detail, 'COACH') && coachInfo?.yearsExperience != null ? [{ icon: 'workspace-premium' as const, k: 'Expérience', v: `${coachInfo.yearsExperience} an${coachInfo.yearsExperience > 1 ? 's' : ''}` }] : []),
                ...(hasRole(detail, 'COACH') && coachInfo?.bio ? [{ icon: 'notes' as const, k: 'Présentation', v: coachInfo.bio }] : []),
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
                <Text style={styles.detailValue}>Planning de travail</Text>
                <Text style={styles.detailKey}>
                  {schedule && schedule.some((d) => d.working)
                    ? `${schedule.filter((d) => d.working).length} jours · ${Math.round(schedule.reduce((s2, d) => s2 + shiftHours(d), 0) * 10) / 10} h / semaine`
                    : 'Non défini'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
            <Button label="Plus d’informations" onPress={() => setStatsOpen(true)} />
            <ResetPasswordButton name={`${detail.firstName} ${detail.lastName}`} email={detail.email} reset={() => resetTeamPassword(detail.id)} />
            <Button label="Supprimer ce compte" variant="outline" onPress={() => setConfirmDelete(true)} />
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
                <Text style={styles.sheetTitle} numberOfLines={1}>Planning · {detail.firstName} {detail.lastName}</Text>
                <Text style={styles.meta}>Semaine type, répétée chaque semaine</Text>
              </View>
            </View>
            {scheduleError ? <Banner tone="danger" icon="error" text={scheduleError} /> : null}
            {(draft ?? []).map((d) => (
              <View key={d.dayOfWeek} style={styles.shiftRow}>
                <View style={{ width: 84 }}>
                  <Text style={styles.detailValue}>{WEEK_DAYS[d.dayOfWeek]}</Text>
                  <Text style={[styles.detailKey, { color: d.working ? colors.successInk : colors.muted }]}>{d.working ? `${shiftHours(d)} h` : 'Repos'}</Text>
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
              <Text style={styles.copyChipText}>Copier le lundi sur mardi – vendredi</Text>
            </Pressable>
            <Button
              label={saveSchedule.isPending ? 'Enregistrement…' : 'Enregistrer le planning'}
              disabled={!draft || saveSchedule.isPending}
              onPress={() =>
                detail &&
                draft &&
                saveSchedule.mutate(
                  { id: detail.id, days: draft },
                  {
                    onSuccess: () => setScheduleOpen(false),
                    onError: (e) => setScheduleError(e instanceof ApiError && e.code === 'SHIFT_END_BEFORE_START' ? 'L’heure de fin doit être après l’heure de début.' : 'Enregistrement impossible. Réessayez.'),
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
                <Text style={styles.sheetTitle} numberOfLines={1}>Activité · {detail.firstName} {detail.lastName}</Text>
                <Text style={styles.meta}>{hasRole(detail, 'COACH') ? 'Coach' : 'Accueil'}</Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {[7, 30, 90].map((d) => (
                <Pressable key={d} onPress={() => setPeriod(d)} style={[styles.filterChip, period === d && styles.filterChipOn]}>
                  <Text style={[styles.filterText, period === d && { color: colors.primaryContrast }]}>{d} jours</Text>
                </Pressable>
              ))}
            </View>

            {statsLoading ? <Text style={styles.meta}>Chargement…</Text> : null}

            {stats?.staff ? (
              <>
                <Text style={styles.statsGroup}>Accueil</Text>
                <View style={styles.statGrid}>
                  {[
                    { icon: 'qr-code-scanner' as const, v: String(stats.staff.scans), l: 'Scans', sub: `${stats.staff.scansGranted} validés` },
                    { icon: 'payments' as const, v: `${Math.round(stats.staff.paymentsTotal).toLocaleString('fr-FR')} DT`, l: 'Encaissé', sub: `${stats.staff.payments} encaissement${stats.staff.payments > 1 ? 's' : ''}` },
                    { icon: 'person-add' as const, v: String(stats.staff.accountsCreated), l: 'Comptes créés', sub: 'adhérents' },
                    { icon: 'event-available' as const, v: String(stats.staff.daysWorked), l: 'Jours travaillés', sub: `sur ${period} jours` },
                    { icon: 'schedule' as const, v: `${stats.staff.hours} h`, l: 'Heures', sub: `${stats.staff.avgHoursPerDay} h / jour` },
                  ].map((c) => (
                    <View key={c.l} style={styles.statCell}>
                      <MaterialIcons name={c.icon} size={20} color={colors.primary} />
                      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{c.v}</Text>
                      <Text style={styles.statLabel}>{c.l}</Text>
                      <Text style={styles.statSub}>{c.sub}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.statNote}>{stats.staff.source === 'planning' ? 'Jours et heures selon le planning de travail défini.' : 'Aucun planning défini : jours et heures estimés d’après l’activité (connexions, scans, encaissements).'}</Text>
              </>
            ) : null}

            {stats?.coach ? (
              <>
                <Text style={styles.statsGroup}>Coaching</Text>
                <View style={styles.statGrid}>
                  {[
                    { icon: 'fitness-center' as const, v: String(stats.coach.sessions), l: 'Cours assurés', sub: `${stats.coach.upcoming} à venir` },
                    { icon: 'groups' as const, v: String(stats.coach.attendees), l: 'Participants', sub: 'présences validées' },
                    { icon: 'event-available' as const, v: String(stats.coach.daysWorked), l: 'Jours travaillés', sub: stats.coach.plannedDays != null ? `${stats.coach.plannedDays} prévus au planning` : `sur ${period} jours` },
                    { icon: 'schedule' as const, v: `${stats.coach.hours} h`, l: 'Heures de cours', sub: stats.coach.plannedHours != null ? `${stats.coach.plannedHours} h prévues` : `${stats.coach.avgHoursPerDay} h / jour` },
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
        <Text style={styles.sheetTitle}>Supprimer {detail?.firstName} {detail?.lastName} ?</Text>
        <Text style={styles.sheetText}>
          Le compte sera désactivé et la personne déconnectée immédiatement. Cette action est définitive.
          {detail && hasRole(detail, 'COACH') ? ' Les cours déjà planifiés resteront sans coach tant que vous ne les réaffectez pas.' : ''}
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label="Oui, supprimer"
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
                  setDeleteError(e instanceof ApiError && e.code === 'CANNOT_DELETE_SELF' ? 'Vous ne pouvez pas supprimer votre propre compte.' : 'La suppression a échoué. Réessayez.');
                },
              })
            }
          />
          <Button label="Annuler" variant="outline" onPress={() => setConfirmDelete(false)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={formOpen} onClose={() => setFormOpen(false)}>
        <Text style={styles.sheetTitle}>Nouveau compte</Text>
        <View style={styles.roleRow}>
          {([['STAFF', 'Accueil', 'badge'], ['COACH', 'Coach', 'sports-gymnastics']] as const).map(([k, l, ic]) => (
            <Pressable key={k} onPress={() => setRole(k)} style={[styles.roleCard, role === k && styles.roleCardOn]}>
              <MaterialIcons name={ic} size={22} color={role === k ? colors.primaryContrast : colors.primaryInk} />
              <Text style={[styles.roleText, role === k && { color: colors.primaryContrast }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sheetText}>Un mot de passe provisoire sera généré. Le changement sera exigé à la première connexion.</Text>
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}
        <TextField label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <TextField label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optionnel" />
        <Button label={create.isPending ? 'Création…' : 'Créer le compte'} onPress={submit} disabled={!valid || create.isPending} />
      </BottomSheet>

      <BottomSheet visible={!!created} onClose={() => setCreated(null)}>
        <Text style={styles.sheetTitle}>Compte {created ? roleLabel(created.role).toLowerCase() : ''} créé · {created?.name}</Text>
        <Text style={styles.sheetText}>Communiquez ces accès. Le mot de passe ne sera plus affiché.</Text>
        <View style={styles.credBox}>
          <Text style={styles.credLabel}>E-mail</Text>
          <Text style={styles.credValue}>{created?.email}</Text>
          <Text style={[styles.credLabel, { marginTop: 10 }]}>Mot de passe provisoire</Text>
          <Text style={styles.credPassword} selectable>{created?.password}</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button
            label={copied ? 'Copié' : 'Copier le mot de passe'}
            variant="outline"
            onPress={async () => {
              if (!created) return;
              await Clipboard.setStringAsync(created.password);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          />
          <Button
            label="Partager les accès"
            onPress={() => created && Share.share({ message: `Compte MuscleUP ${roleLabel(created.role).toLowerCase()}\nE-mail : ${created.email}\nMot de passe provisoire : ${created.password}` })}
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
