import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { TextField } from '../../src/components/TextField';
import { Banner, ScreenTitle, SkeletonList } from '../../src/components/ui';
import { StickyActionBar, STICKY_BAR_SPACE } from '../../src/components/ui/StickyActionBar';
import { DateTimeFields } from '../../src/components/ui/DateTimeFields';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import {
  useAudiences,
  useCancelScheduledNotification,
  useCreateNotificationRule,
  useDeleteNotificationRule,
  useNotificationHistory,
  useNotificationRules,
  useScheduledNotifications,
  useSendNotification,
  useToggleNotificationRule,
  type RuleCondition,
} from '../../src/hooks/useAdmin';
import { useTranslation } from 'react-i18next';
import i18n, { dateLocale } from '../../src/i18n';
import { WEEKDAYS_NARROW_MON, WEEKDAYS_SHORT_MON } from '../../src/i18n/labels';
import { HScroll } from '../../src/components/ui/HScroll';

const KINDS = ['Annonce', 'Rappel', 'Offre'] as const;
const DAY_LETTERS = WEEKDAYS_NARROW_MON;
const DAY_NAMES = WEEKDAYS_SHORT_MON;
const CONDITIONS: { key: RuleCondition; label: string; sub: string; icon: 'all-inclusive' | 'schedule' | 'person-off' | 'event' }[] = [
  { key: 'NONE', get label() { return i18n.t('admin.aucune_condition'); }, get sub() { return i18n.t('admin.envoyer_a_tout_le_groupe'); }, icon: 'all-inclusive' },
  { key: 'EXPIRES_7D', get label() { return i18n.t('admin.expire_dans_7_jours'); }, get sub() { return i18n.t('admin.abonnement_proche_de_lecheance'); }, icon: 'schedule' },
  { key: 'ABSENT_14D', get label() { return i18n.t('admin.absent_depuis_14_jours'); }, get sub() { return i18n.t('admin.aucune_seance_depuis_2_semaines'); }, icon: 'person-off' },
  { key: 'CLASS_TOMORROW', get label() { return i18n.t('admin.cours_demain'); }, get sub() { return i18n.t('admin.inscrit_a_un_cours_demain'); }, icon: 'event' },
];
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function dayText(days: number[]): string {
  if (days.length === 7) return i18n.t('admin.tous_les_jours');
  if (days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d))) return i18n.t('admin.du_lundi_au_vendredi');
  if (days.length === 2 && days.includes(5) && days.includes(6)) return i18n.t('admin.le_week_end');
  return [...days].sort().map((d) => DAY_NAMES[d]).join(', ') || i18n.t('admin.aucun_jour');
}

/** Notifications push (admin) : composer, programmer, historique, règles récurrentes. */
export default function AdminNotificationsScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: aud } = useAudiences();
  const { data: scheduled, refetch, isLoading: scheduledLoading } = useScheduledNotifications();
  const { data: history, refetch: refetchHistory, isLoading: historyLoading } = useNotificationHistory();
  const { data: rules, isLoading: rulesLoading } = useNotificationRules();
  const send = useSendNotification();
  const cancel = useCancelScheduledNotification();
  const createRule = useCreateNotificationRule();
  const toggleRule = useToggleNotificationRule();
  const deleteRule = useDeleteNotificationRule();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(() => Promise.all([refetch(), refetchHistory()]));

  const [seg, setSeg] = useState(0);
  const [kind, setKind] = useState<(typeof KINDS)[number]>('Annonce');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [later, setLater] = useState(false);
  const [sendAt, setSendAt] = useState(() => new Date(Date.now() + 3_600_000));
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ruleOpen, setRuleOpen] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rBody, setRBody] = useState('');
  const [rAudience, setRAudience] = useState('ALL');
  const [rCond, setRCond] = useState<RuleCondition>('NONE');
  const [rDays, setRDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [rTime, setRTime] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const audiences = aud?.audiences ?? [];
  const audienceName = (a: { key: string; label: string }) =>
    a.key.startsWith('PLAN:') ? `${t('admin.aud_plan')} ${a.label.replace(/^Forfait /, '')}` : t(`admin.aud_${a.key}`, { defaultValue: a.label });
  const audLabel = (key: string) => {
    const a = audiences.find((x) => x.key === key);
    return a ? audienceName(a) : key;
  };
  const audCount = (key: string) => audiences.find((a) => a.key === key)?.count ?? 0;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  const segs = [t('admin.tab_compose'), t('admin.tab_scheduled', { count: scheduled?.length ?? 0 }), t('admin.tab_history'), t('admin.tab_rules', { count: rules?.length ?? 0 })];

  const submit = () => {
    setError(null);
    send.mutate(
      { kind, title: title.trim(), body: body.trim(), audience, sendAt: later ? sendAt.toISOString() : undefined },
      {
        onSuccess: (r) => {
          setFlash(later ? t('admin.notification_programmee_pour_le', { v0: fmtDate(sendAt.toISOString()) }) : t('admin.envoyee_a_adherent_s', { sentCount: r.sentCount }));
          setTitle('');
          setBody('');
          setSeg(later ? 1 : 2);
        },
        onError: () => setError(t('admin.la_notification_na_pas_pu')),
      },
    );
  };

  const Radio = ({ active }: { active: boolean }) => (
    <View style={[styles.radio, active && { borderColor: colors.primary }]}>{active ? <View style={styles.radioDot} /> : null}</View>
  );

  const AudiencePicker = ({ value, onChange }: { value: string; onChange: (k: string) => void }) => (
    <View style={styles.listBox}>
      {audiences.map((a) => (
        <Pressable key={a.key} onPress={() => onChange(a.key)} style={[styles.pickRow, value === a.key && styles.pickRowActive]}>
          <View style={[styles.pickIcon, value === a.key && { backgroundColor: colors.primary }]}>
            <MaterialIcons name="groups" size={20} color={value === a.key ? '#FFFFFF' : colors.primaryInk} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.pickTitle} numberOfLines={1}>{audienceName(a)}</Text>
            <Text style={styles.pickSub}>{i18n.t('admin.adherent', { count: a.count, v2: a.count > 1 ? 's' : '' })}</Text>
          </View>
          <Radio active={value === a.key} />
        </Pressable>
      ))}
    </View>
  );

  const valid = title.trim().length > 0 && body.trim().length > 0;
  const ruleValid = rTitle.trim() && rBody.trim() && rDays.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, seg === 0 && { paddingBottom: STICKY_BAR_SPACE + 30 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.plus')}</Text>
        </Pressable>
        <ScreenTitle title={t('common.notifications')} subtitle={t('admin.envoyer_ou_programmer_une_notification')} />

        <HScroll contentContainerStyle={{ gap: 8 }}>
          {segs.map((l, i) => (
            <Pressable key={l} onPress={() => setSeg(i)} style={[styles.seg, seg === i && styles.segActive]}>
              <Text style={[styles.segText, seg === i && { color: colors.primaryContrast }]}>{l}</Text>
            </Pressable>
          ))}
        </HScroll>

        {flash ? <Banner tone="success" icon="check-circle-outline" text={flash} /> : null}
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        {seg === 0 ? (
          <>
            <Text style={styles.label}>{t('admin.type')}</Text>
            <View style={styles.chips}>
              {KINDS.map((k) => (
                <Pressable key={k} onPress={() => setKind(k)} style={[styles.chip, kind === k && styles.chipActive]}>
                  <Text style={[styles.chipText, kind === k && { color: colors.primaryContrast }]}>{t(`admin.kind_${k}`)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.card, cardShadow]}>
              <TextField label={t('admin.titre')} value={title} onChangeText={setTitle} placeholder={t('admin.titre_de_la_notification')} />
              <TextField label={t('common.message')} value={body} onChangeText={setBody} placeholder={t('admin.votre_message')} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
            </View>

            <Text style={styles.label}>{t('common.destinataires')}</Text>
            <AudiencePicker value={audience} onChange={setAudience} />

            <Text style={styles.label}>{t('admin.envoi')}</Text>
            <View style={styles.chips}>
              <Pressable onPress={() => setLater(false)} style={[styles.chip, !later && styles.chipActive]}>
                <Text style={[styles.chipText, !later && { color: colors.primaryContrast }]}>{t('admin.maintenant')}</Text>
              </Pressable>
              <Pressable onPress={() => setLater(true)} style={[styles.chip, later && styles.chipActive]}>
                <Text style={[styles.chipText, later && { color: colors.primaryContrast }]}>{t('admin.programmer')}</Text>
              </Pressable>
            </View>
            {later ? <DateTimeFields value={sendAt} onChange={setSendAt} minimumDate={new Date()} /> : null}

            <Text style={styles.label}>{t('admin.apercu_sur_lecran_adherent')}</Text>
            <View style={[styles.preview, cardShadow]}>
              <View style={styles.previewHead}>
                <View style={styles.brand}><Text style={styles.brandText}>M</Text></View>
                <Text style={styles.previewWhen}>{t('admin.muscleup', { v1: later ? fmtDate(sendAt.toISOString()) : 'maintenant' })}</Text>
              </View>
              <Text style={styles.previewTitle}>{title || t('admin.titre_de_la_notification')}</Text>
              <Text style={styles.previewBody}>{body || t('admin.le_message_apparaitra_ici')}</Text>
              <Text style={styles.previewTo}>{t('admin.sera_envoyee_a_adherents', { v1: audCount(audience), v3: audLabel(audience) })}</Text>
            </View>

          </>
        ) : null}

        {seg === 1 ? (
          <View style={{ gap: 10 }}>
            {(scheduled ?? []).map((n) => (
              <View key={n.id} style={[styles.item, cardShadow]}>
                <View style={styles.itemTop}>
                  <View style={styles.kindTag}><Text style={styles.kindTagText}>{n.kind}</Text></View>
                  <Text style={styles.itemMeta}>{fmtDate(n.sendAt)}</Text>
                </View>
                <Text style={styles.itemTitle}>{n.title}</Text>
                <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
                <View style={styles.itemBottom}>
                  <View style={styles.inline}>
                    <MaterialIcons name="schedule" size={16} color={colors.primaryInk} />
                    <Text style={styles.periodText}>{fmtDate(n.sendAt)} · {audLabel(n.audience)}</Text>
                  </View>
                  <Pressable onPress={() => cancel.mutate(n.id)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>{t('common.annuler')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {scheduledLoading ? <SkeletonList count={3} height={96} /> : (scheduled ?? []).length === 0 ? <Empty icon="schedule-send" text={t('admin.aucune_notification_programmee')} /> : null}
          </View>
        ) : null}

        {seg === 2 ? (
          <View style={{ gap: 10 }}>
            {(history ?? []).map((n) => (
              <View key={n.id} style={[styles.item, cardShadow]}>
                <View style={styles.itemTop}>
                  <View style={styles.kindTag}><Text style={styles.kindTagText}>{n.kind}</Text></View>
                  <Text style={styles.itemMeta}>{fmtDate(n.sentAt ?? n.sendAt)}</Text>
                </View>
                <Text style={styles.itemTitle}>{n.title}</Text>
                <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
                <View style={styles.itemBottom}>
                  <Text style={styles.periodText}>{t('admin.envois', { v0: audLabel(n.audience), sentCount: n.sentCount })}</Text>
                  <Text style={[styles.periodText, { color: colors.successInk }]}>{t('admin.ouvertes', { openRate: n.openRate })}</Text>
                </View>
              </View>
            ))}
            {historyLoading ? <SkeletonList count={3} height={96} /> : (history ?? []).length === 0 ? <Empty icon="history" text={t('admin.aucune_notification_envoyee_pour_le')} /> : null}
          </View>
        ) : null}

        {seg === 3 ? (
          <View style={{ gap: 10 }}>
            <Pressable onPress={() => setRuleOpen((o) => !o)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
              <LinearGradient colors={ruleOpen ? [colors.surface, colors.surface] : [colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, ruleOpen && { borderWidth: 1, borderColor: colors.border }]}>
                <MaterialIcons name={ruleOpen ? 'close' : 'add'} size={22} color={ruleOpen ? colors.text : colors.primaryContrast} />
                <Text style={[styles.ctaText, ruleOpen && { color: colors.text }]}>{ruleOpen ? t('common.close') : t('admin.nouvelle_regle')}</Text>
              </LinearGradient>
            </Pressable>

            {ruleOpen ? (
              <View style={{ gap: 10 }}>
                <View style={[styles.card, cardShadow]}>
                  <TextField label={t('admin.titre')} value={rTitle} onChangeText={setRTitle} placeholder={t('admin.ex_votre_abonnement_expire_bientot')} />
                  <TextField label={t('common.message')} value={rBody} onChangeText={setRBody} placeholder={t('admin.votre_message')} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
                </View>
                <Text style={styles.label}>{t('common.destinataires')}</Text>
                <AudiencePicker value={rAudience} onChange={setRAudience} />
                <Text style={styles.label}>{t('admin.condition_denvoi')}</Text>
                <View style={styles.listBox}>
                  {CONDITIONS.map((c) => (
                    <Pressable key={c.key} onPress={() => setRCond(c.key)} style={[styles.pickRow, rCond === c.key && styles.pickRowActive]}>
                      <View style={[styles.pickIcon, rCond === c.key && { backgroundColor: colors.primary }]}>
                        <MaterialIcons name={c.icon} size={20} color={rCond === c.key ? '#FFFFFF' : colors.primaryInk} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.pickTitle}>{c.label}</Text>
                        <Text style={styles.pickSub}>{c.sub}{c.key !== 'NONE' && aud?.conditions[c.key] !== undefined ? ` · ≈ ${aud.conditions[c.key]}` : ''}</Text>
                      </View>
                      <Radio active={rCond === c.key} />
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>{t('admin.jours_denvoi')}</Text>
                <View style={styles.daysRow}>
                  {DAY_LETTERS.map((l, i) => {
                    const on = rDays.includes(i);
                    return (
                      <Pressable key={i} onPress={() => setRDays((d) => (on ? d.filter((x) => x !== i) : [...d, i]))} style={[styles.dayPill, on && styles.dayPillOn]}>
                        <Text style={[styles.dayText, on && { color: '#FFFFFF' }]}>{l}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.label}>{t('admin.heure_denvoi')}</Text>
                <DateTimeFields value={rTime} onChange={setRTime} timeOnly />
                <Text style={styles.periodText}>{t('admin.chaque_jour_selectionne_a', { v1: hhmm(rTime) })}</Text>
                <Pressable
                  disabled={!ruleValid || createRule.isPending}
                  onPress={() =>
                    createRule.mutate(
                      { title: rTitle.trim(), body: rBody.trim(), audience: rAudience, condition: rCond, days: [...rDays].sort(), time: hhmm(rTime) },
                      { onSuccess: () => { setRuleOpen(false); setRTitle(''); setRBody(''); } },
                    )
                  }
                  style={(!ruleValid || createRule.isPending) && { opacity: 0.5 }}
                >
                  <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                    <MaterialIcons name="repeat" size={22} color={colors.primaryContrast} />
                    <Text style={styles.ctaText}>{t('admin.creer_la_regle')}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : null}

            {(rules ?? []).map((r) => (
              <View key={r.id} style={[styles.item, cardShadow, !r.isActive && { opacity: 0.6 }]}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemTitle, { flex: 1 }]} numberOfLines={1}>{r.title}</Text>
                  <Switch value={r.isActive} onValueChange={(v) => toggleRule.mutate({ id: r.id, isActive: v })} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
                </View>
                <Text style={styles.itemBody} numberOfLines={2}>{r.body}</Text>
                <View style={styles.itemBottom}>
                  <View style={[styles.inline, { flex: 1 }]}>
                    <MaterialIcons name="repeat" size={16} color={colors.primaryInk} />
                    <Text style={styles.periodText} numberOfLines={2}>
                      {t('admin.rule_summary', { days: dayText(r.days), time: r.time, audience: audLabel(r.audience), condition: r.condition !== 'NONE' ? ` · ${CONDITIONS.find((c) => c.key === r.condition)?.label}` : '' })}
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteRule.mutate(r.id)} hitSlop={8}>
                    <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
                  </Pressable>
                </View>
              </View>
            ))}
            {rulesLoading ? <SkeletonList count={2} height={96} /> : (rules ?? []).length === 0 && !ruleOpen ? <Empty icon="repeat" text={t('admin.aucune_regle_recurrente')} /> : null}
          </View>
        ) : null}
      </ScrollView>
      <StickyActionBar visible={seg === 0} label={later ? t('admin.programmer_lenvoi') : t('admin.envoyer_maintenant')} icon={later ? 'schedule-send' : 'send'} loading={send.isPending} disabled={!valid} onPress={submit} />
    </SafeAreaView>
  );

  function Empty({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
    return (
      <View style={[styles.empty, cardShadow]}>
        <MaterialIcons name={icon} size={32} color={colors.primaryInk} />
        <Text style={styles.emptyText}>{text}</Text>
      </View>
    );
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 12, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    seg: { height: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    segActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    segText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { height: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    card: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    listBox: { padding: 6, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 10, borderRadius: 18 },
    pickRowActive: { backgroundColor: colors.primarySoft },
    pickIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    pickTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    pickSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    preview: { padding: 14, gap: 4, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    previewHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    brand: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    brandText: { fontFamily: fonts.head, fontSize: 12, color: '#FFFFFF' },
    previewWhen: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    previewTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    previewBody: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    previewTo: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk, marginTop: 6 },
    cta: { minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryContrast },
    item: { padding: 14, gap: 6, backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
    itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    kindTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.primarySoft },
    kindTagText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.primaryInk },
    itemMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    itemTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    itemBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
    itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    periodText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primaryInk, flexShrink: 1 },
    cancelBtn: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
    cancelText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.dangerInk },
    daysRow: { flexDirection: 'row', gap: 6 },
    dayPill: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    dayPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayText: { fontFamily: fonts.head, fontSize: 15, color: colors.text },
    empty: { padding: 28, alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  });
}
