import { useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
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
import { InitialsAvatar, StatusTag } from './staffUi';

type Filter = 'all' | 'locked' | 'failed' | 'disabled';

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
          <SkeletonList count={3} height={120} />
        ) : shown.length === 0 ? (
          <EmptyState icon="lock-open" tone="success" title={t('staff.locked_empty_title')} text={t('staff.locked_empty_text')} />
        ) : (
          shown.map((item) => {
            const secondsLeft = item.lockedUntil ? Math.max(0, Math.ceil((new Date(item.lockedUntil).getTime() - nowMs) / 1000)) : 0;
            const locked = item.reason === 'LOCKED' && secondsLeft > 0;
            const tag = locked
              ? { label: t('staff.locked_tag_locked', { time: formatCountdown(secondsLeft) }), tone: 'danger' as const }
              : item.reason === 'SUSPENDED'
                ? { label: t('staff.locked_tag_disabled'), tone: 'muted' as const }
                : { label: t('staff.locked_tag_failures', { count: item.failures || item.lockCount }), tone: 'warning' as const };
            const detail = locked
              ? t('staff.locked_detail_locked', { time: formatCountdown(secondsLeft) })
              : item.reason === 'SUSPENDED'
                ? t('staff.locked_detail_disabled')
                : item.lastAttemptAt
                  ? t('staff.locked_detail_failed', {
                      when: new Date(item.lastAttemptAt).toLocaleString(dateLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    })
                  : '';
            const canUnlock = locked || item.failures > 0 || item.lockCount > 0;
            return (
              <View key={item.id} style={[styles.card, cardShadow]}>
                <View style={styles.head}>
                  <InitialsAvatar first={item.firstName} last={item.lastName} size={46} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                    {item.email ? <Text style={styles.email} numberOfLines={1}>{item.email}</Text> : null}
                  </View>
                  <StatusTag label={tag.label} tone={tag.tone} />
                </View>
                {detail ? <Text style={styles.detail}>{detail}</Text> : null}
                <View style={styles.actions}>
                  {canUnlock ? (
                    <Button
                      label={t('staff.locked_unlock')}
                      loading={unlock.isPending && unlock.variables === item.id}
                      onPress={() => run(unlock.mutateAsync(item.id), t('staff.locked_unlocked'))}
                    />
                  ) : null}
                  {isAdmin && item.reason === 'SUSPENDED' ? (
                    <Button
                      label={t('staff.locked_reactivate')}
                      variant="secondary"
                      loading={setStatus.isPending && setStatus.variables?.id === item.id}
                      onPress={() => run(setStatus.mutateAsync({ id: item.id, suspended: false }), t('staff.locked_reactivated'))}
                    />
                  ) : null}
                  <ResetPasswordButton name={`${item.firstName} ${item.lastName}`} email={item.email} reset={() => resetMemberPassword(item.id)} />
                  <View style={styles.row}>
                    {item.phone ? (
                      <View style={{ flex: 1 }}>
                        <Button label={t('staff.locked_call')} variant="ghost" onPress={() => void Linking.openURL(`tel:${item.phone!.replace(/\s+/g, '')}`)} />
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Button label={t('staff.locked_profile')} variant="ghost" onPress={() => router.push(routes.member(item.id))} />
                    </View>
                  </View>
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

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    chips: { gap: 8, paddingVertical: 2 },
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
    head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    name: { fontFamily: fonts.headSemiBold, fontSize: 16, color: colors.text },
    email: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    detail: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    actions: { gap: spacing.sm, marginTop: 4 },
    row: { flexDirection: 'row', gap: spacing.sm },
  });
}
