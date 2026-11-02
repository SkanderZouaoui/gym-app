import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { dateLocale } from '../../i18n';
import { Banner, BottomSheet } from '../ui';
import { Button } from '../Button';
import { haptics } from '../../utils/haptics';
import { useCancelMembership, useDeleteMember, useExtendMembership, useSetMemberStatus, useSetMembershipSuspended, type MemberDetail, type StaffMembership } from '../../hooks/useStaff';

const PRESETS = [7, 15, 30, 90];

type Sheet = 'extend' | 'cancel' | 'delete' | null;

/**
 * Actions sur un adhérent : prolonger ou suspendre son abonnement (accueil et admin) ; annuler l'abonnement, suspendre
 * ou réactiver le compte et supprimer l'adhérent (admin uniquement, comme l'API).
 */
export function MemberAdminSection({ member, current, isAdmin, onDeleted }: { member: MemberDetail; current?: StaffMembership; isAdmin: boolean; onDeleted: () => void }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const status = useSetMemberStatus();
  const remove = useDeleteMember();
  const extend = useExtendMembership();
  const suspendMembership = useSetMembershipSuspended();
  const cancel = useCancelMembership();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const accountSuspended = member.status === 'SUSPENDED';
  const membershipSuspended = current?.status === 'SUSPENDED';
  const live = current?.status === 'ACTIVE' || current?.status === 'SUSPENDED';
  const name = `${member.firstName} ${member.lastName}`;
  const newEnd = current ? new Date(new Date(current.endDate).getTime() + days * 86_400_000).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const ok = (text: string) => {
    void haptics.success();
    setMessage({ tone: 'success', text });
    setSheet(null);
  };
  const fail = () => {
    void haptics.error();
    setMessage({ tone: 'danger', text: t('staff.adm_error') });
    setSheet(null);
  };

  return (
    <View>
      <Text style={styles.title}>{isAdmin ? t('staff.adm_title') : t('admin.abonnements')}</Text>
      {message ? <Banner tone={message.tone} icon={message.tone === 'success' ? 'check-circle' : 'error'} text={message.text} /> : null}
      <View style={[styles.card, cardShadow]}>
        {current ? (
          <>
            <Text style={styles.group}>{t('staff.adm_membership', { plan: current.plan.name })}</Text>
            <AdminRow icon="update" label={t('staff.adm_extend')} onPress={() => setSheet('extend')} />
            {live ? (
              <AdminRow
                icon={membershipSuspended ? 'play-circle-outline' : 'pause-circle-outline'}
                label={membershipSuspended ? t('staff.adm_reactivate_membership') : t('staff.adm_suspend_membership')}
                busy={suspendMembership.isPending}
                onPress={() => suspendMembership.mutate({ id: current.id, suspended: !membershipSuspended }, { onSuccess: () => ok(membershipSuspended ? t('staff.adm_membership_reactivated') : t('staff.adm_membership_suspended')), onError: fail })}
              />
            ) : null}
            {live && isAdmin ? <AdminRow icon="event-busy" label={t('staff.adm_cancel_membership')} danger onPress={() => setSheet('cancel')} /> : null}
          </>
        ) : null}
        {isAdmin ? (
          <>
        <Text style={styles.group}>{t('staff.adm_account')}</Text>
        <AdminRow
          icon={accountSuspended ? 'lock-open' : 'block'}
          label={accountSuspended ? t('staff.adm_reactivate_account') : t('staff.adm_suspend_account')}
          busy={status.isPending}
          onPress={() => status.mutate({ id: member.id, suspended: !accountSuspended }, { onSuccess: () => ok(accountSuspended ? t('staff.adm_account_reactivated') : t('staff.adm_account_suspended')), onError: fail })}
        />
        <AdminRow icon="delete-outline" label={t('staff.adm_delete')} danger onPress={() => setSheet('delete')} />
          </>
        ) : null}
      </View>

      <BottomSheet visible={sheet === 'extend'} onClose={() => setSheet(null)}>
        <Text style={styles.sheetTitle}>{t('staff.adm_extend_title')}</Text>
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => setDays(p)} style={[styles.preset, days === p && { backgroundColor: colors.primary }]}>
              <Text style={[styles.presetText, days === p && { color: colors.primaryContrast }]}>{t('staff.adm_days', { n: p })}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => setDays((d) => Math.max(1, d - 1))} accessibilityLabel="-"><MaterialIcons name="remove" size={22} color={colors.primaryInk} /></Pressable>
          <Text style={styles.stepValue}>{t('staff.adm_days', { n: days })}</Text>
          <Pressable style={styles.stepBtn} onPress={() => setDays((d) => Math.min(365, d + 1))} accessibilityLabel="+"><MaterialIcons name="add" size={22} color={colors.primaryInk} /></Pressable>
        </View>
        <Text style={styles.sheetText}>{t('staff.adm_new_end', { date: newEnd })}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('staff.adm_extend_confirm', { n: days })} loading={extend.isPending} onPress={() => current && extend.mutate({ id: current.id, days }, { onSuccess: () => ok(t('staff.adm_extended', { n: days })), onError: fail })} />
          <Button label={t('common.annuler')} variant="outline" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === 'cancel'} onClose={() => setSheet(null)}>
        <Text style={styles.sheetTitle}>{t('staff.adm_cancel_title')}</Text>
        <Text style={styles.sheetText}>{t('staff.adm_cancel_text', { plan: current?.plan.name ?? '', name })}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('staff.adm_cancel_membership')} variant="danger" loading={cancel.isPending} onPress={() => current && cancel.mutate(current.id, { onSuccess: () => ok(t('staff.adm_membership_cancelled')), onError: fail })} />
          <Button label={t('staff.adm_keep')} variant="outline" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === 'delete'} onClose={() => setSheet(null)}>
        <Text style={styles.sheetTitle}>{t('staff.adm_delete_title', { name })}</Text>
        <Text style={styles.sheetText}>{t('staff.adm_delete_text')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('staff.adm_delete')} variant="danger" loading={remove.isPending} onPress={() => remove.mutate(member.id, { onSuccess: () => { setSheet(null); void haptics.success(); onDeleted(); }, onError: fail })} />
          <Button label={t('common.annuler')} variant="outline" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>
    </View>
  );
}

function AdminRow({ icon, label, onPress, danger, busy }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; danger?: boolean; busy?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }, busy && { opacity: 0.5 }]} accessibilityRole="button">
      <View style={[styles.rowIcon, danger && { backgroundColor: colors.dangerSoft }]}>
        <MaterialIcons name={icon} size={20} color={danger ? colors.dangerInk : colors.primaryInk} />
      </View>
      <Text style={[styles.rowText, danger && { color: colors.dangerInk }]}>{label}</Text>
      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    title: { fontFamily: fonts.headBold, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginBottom: 10, marginTop: 6 },
    card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: 6 },
    group: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 10, borderRadius: radii.md },
    rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14.5, color: colors.text },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    preset: { height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    presetText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 8 },
    stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    stepValue: { minWidth: 110, textAlign: 'center', fontFamily: fonts.head, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  });
}
