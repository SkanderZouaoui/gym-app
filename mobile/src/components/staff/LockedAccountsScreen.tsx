import { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useSessionStore } from '../../store/session';
import { useStaffRoutes } from '../../navigation/staffRoutes';
import { resetMemberPassword, useLoginIssues, useSetMemberStatus, useUnlockLogin, type LoginIssue } from '../../hooks/useStaff';
import { useOfflineAwareRefresh } from '../../hooks/useOfflineAwareRefresh';
import { useNow } from '../../hooks/useNow';
import { dateLocale } from '../../i18n';
import { Button } from '../Button';
import { ResetPasswordButton } from '../ResetPasswordButton';
import { ScreenHeader } from '../ScreenHeader';
import { Banner, Chip, EmptyState, SkeletonList, Toast } from '../ui';
import { InitialsAvatar } from './staffUi';

type Filter = 'all' | 'locked' | 'failed' | 'disabled';

/** Durée du blocage selon le nombre de blocages déjà subis (même progression que le serveur : 30 s, 5 min, 15 min). */
const LOCK_SECONDS = [30, 5 * 60, 15 * 60];
/** Échecs qui déclenchent le blocage suivant, selon le nombre de blocages déjà subis (5, puis 2, puis 3, puis 2…). */
const ATTEMPTS_BEFORE_LOCK = [5, 2, 3];

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Comptes adhérents bloqués (accueil et admin) : bloqués temporairement après trop d'échecs de connexion, avec des
 * échecs récents, ou désactivés. Actions : débloquer pour réessayer, réinitialiser le mot de passe, appeler,
 * ouvrir la fiche et — admin seulement — réactiver un compte désactivé. */
export function LockedAccountsScreen({ fallbackHref }: { fallbackHref: string }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const routes = useStaffRoutes();
  const isAdmin = useSessionStore((s) => s.activeRole) === 'ADMIN';
  const nowMs = useNow(1000);
  const { data: issues, isLoading, refetch } = useLoginIssues();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const unlock = useUnlockLogin();
  const setStatus = useSetMemberStatus();
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = issues ?? [];
  const counts = {
    all: list.length,
    locked: list.filter((i) => i.reason === 'LOCKED').length,
    failed: list.filter((i) => i.reason === 'FAILED_ATTEMPTS').length,
    disabled: list.filter((i) => i.reason === 'SUSPENDED').length,
  };
  const reasonOf: Record<Exclude<Filter, 'all'>, LoginIssue['reason']> = { locked: 'LOCKED', failed: 'FAILED_ATTEMPTS', disabled: 'SUSPENDED' };
  const shown = filter === 'all' ? list : list.filter((i) => i.reason === reasonOf[filter]);

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2600);
  };
  const run = (action: Promise<unknown>, doneText: string) => {
    setError(null);
    action.then(() => flash(doneText)).catch(() => setError(t('staff.locked_error')));
  };

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('common.tous') },
    { value: 'locked', label: t('staff.locked_filter_locked') },
    { value: 'failed', label: t('staff.locked_filter_failed') },
    { value: 'disabled', label: t('staff.locked_filter_disabled') },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={t('staff.locked_title')} fallbackHref={fallbackHref} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{t('staff.locked_subtitle')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map((f) => (
            <Chip key={f.value} label={`${f.label} · ${counts[f.value]}`} active={filter === f.value} onPress={() => setFilter(f.value)} />
          ))}
        </ScrollView>

        {error ? <Banner tone="danger" icon="error" text={error} onClose={() => setError(null)} /> : null}

        {isLoading && !issues ? (
          <SkeletonList count={3} height={140} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={filter === 'disabled' ? 'person-off' : filter === 'failed' ? 'check-circle' : 'lock-open'}
            tone="success"
            title={t(`staff.locked_empty_${filter === 'all' ? 'locked' : filter}_title`)}
            text={t(filter === 'all' ? 'staff.locked_empty_text' : `staff.locked_empty_${filter}_text`)}
          />
        ) : (
          shown.map((item) => {
            const secondsLeft = item.lockedUntil ? Math.max(0, Math.ceil((new Date(item.lockedUntil).getTime() - nowMs) / 1000)) : 0;
            const locked = item.reason === 'LOCKED' && secondsLeft > 0;
            const disabled = item.reason === 'SUSPENDED';
            // La couleur ne sert qu'au petit point de statut : le reste de la carte reste neutre.
            const dot = locked ? colors.danger : disabled ? colors.muted : colors.warning;
            const statusLabel = locked ? t('staff.locked_status_locked') : disabled ? t('staff.locked_status_disabled') : t('staff.locked_status_failed');
            const totalLock = LOCK_SECONDS[Math.min(Math.max(item.lockCount, 1), LOCK_SECONDS.length) - 1];
            const threshold = ATTEMPTS_BEFORE_LOCK[item.lockCount] ?? 2;
            const lastAttempt = item.lastAttemptAt
              ? new Date(item.lastAttemptAt).toLocaleString(dateLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : null;
            const canUnlock = locked || item.failures > 0 || item.lockCount > 0;
            return (
              <View key={item.id} style={[styles.card, cardShadow]}>
                <Pressable style={styles.head} onPress={() => router.push(routes.member(item.id))} accessibilityRole="button">
                  <InitialsAvatar first={item.firstName} last={item.lastName} size={44} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                    {item.email ? <Text style={styles.email} numberOfLines={1}>{item.email}</Text> : null}
                  </View>
                  <View style={styles.status}>
                    <View style={[styles.statusDot, { backgroundColor: dot }]} />
                    <Text style={styles.statusText}>{statusLabel}</Text>
                  </View>
                </Pressable>

                <View style={styles.divider} />

                <View style={styles.state}>
                  <View style={styles.stateRow}>
                    <Text style={styles.stateLabel}>
                      {locked ? t('staff.locked_label_retry') : disabled ? t('staff.locked_label_account') : t('staff.locked_label_attempts')}
                    </Text>
                    <Text style={styles.stateValue}>
                      {locked ? formatCountdown(secondsLeft) : disabled ? t('staff.locked_value_disabled') : `${item.failures} / ${threshold}`}
                    </Text>
                  </View>
                  {locked ? (
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${Math.min(100, (secondsLeft / totalLock) * 100)}%` }]} />
                    </View>
                  ) : !disabled ? (
                    <View style={styles.segments}>
                      {Array.from({ length: threshold }, (_, i) => (
                        <View key={i} style={[styles.segment, i < item.failures && styles.segmentOn]} />
                      ))}
                    </View>
                  ) : null}
                  {!locked && !disabled && lastAttempt ? <Text style={styles.hint}>{t('staff.locked_last_failure', { when: lastAttempt })}</Text> : null}
                </View>

                {canUnlock ? (
                  <Button
                    label={t('staff.locked_unlock')}
                    loading={unlock.isPending && unlock.variables === item.id}
                    onPress={() => run(unlock.mutateAsync(item.id), t('staff.locked_unlocked'))}
                  />
                ) : null}
                {isAdmin && disabled ? (
                  <Button
                    label={t('staff.locked_reactivate')}
                    loading={setStatus.isPending && setStatus.variables?.id === item.id}
                    onPress={() => run(setStatus.mutateAsync({ id: item.id, suspended: false }), t('staff.locked_reactivated'))}
                  />
                ) : null}

                <View style={styles.quick}>
                  <ResetPasswordButton
                    name={`${item.firstName} ${item.lastName}`}
                    email={item.email}
                    reset={() => resetMemberPassword(item.id)}
                    renderTrigger={(open) => <QuickAction icon="key" label={t('staff.locked_action_password')} onPress={open} />}
                  />
                  {item.phone ? (
                    <QuickAction icon="call" label={t('staff.locked_call')} onPress={() => void Linking.openURL(`tel:${item.phone!.replace(/\s+/g, '')}`)} />
                  ) : null}
                  <QuickAction icon="person" label={t('staff.locked_profile')} onPress={() => router.push(routes.member(item.id))} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      {toast ? <Toast icon="lock-open" text={toast} iconColor={colors.successInk} /> : null}
    </SafeAreaView>
  );
}

/** Action secondaire discrète : icône et libellé sur une seule ligne, sans fond. */
function QuickAction({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}
    >
      <MaterialIcons name={icon} size={18} color={colors.muted} />
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: -4 },
    chips: { gap: 8, paddingVertical: 2 },
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    name: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    email: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface2, paddingHorizontal: 10, height: 28, borderRadius: 14 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.text },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    state: { gap: 10 },
    stateRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    stateLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
    stateValue: { fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] },
    track: { height: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 2, backgroundColor: colors.text },
    segments: { flexDirection: 'row', gap: 4 },
    segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
    segmentOn: { backgroundColor: colors.text },
    hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    quick: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: -4 },
  });
}
