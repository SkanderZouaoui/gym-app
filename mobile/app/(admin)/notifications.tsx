import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { TextField } from '../../src/components/TextField';
import { Banner, ScreenTitle } from '../../src/components/ui';
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

const KINDS = ['Annonce', 'Rappel', 'Offre'] as const;
const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const CONDITIONS: { key: RuleCondition; label: string; sub: string; icon: 'all-inclusive' | 'schedule' | 'person-off' | 'event' }[] = [
  { key: 'NONE', label: 'Aucune condition', sub: 'Envoyer à tout le groupe', icon: 'all-inclusive' },
  { key: 'EXPIRES_7D', label: 'Expire dans 7 jours', sub: 'Abonnement proche de l’échéance', icon: 'schedule' },
  { key: 'ABSENT_14D', label: 'Absent depuis 14 jours', sub: 'Aucune séance depuis 2 semaines', icon: 'person-off' },
  { key: 'CLASS_TOMORROW', label: 'Cours demain', sub: 'Inscrit à un cours demain', icon: 'event' },
];
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function dayText(days: number[]): string {
  if (days.length === 7) return 'Tous les jours';
  if (days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d))) return 'Du lundi au vendredi';
  if (days.length === 2 && days.includes(5) && days.includes(6)) return 'Le week-end';
  return [...days].sort().map((d) => DAY_NAMES[d]).join(', ') || 'Aucun jour';
}

/** Notifications push (admin) : composer, programmer, historique, règles récurrentes. */
export default function AdminNotificationsScreen() {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: aud } = useAudiences();
  const { data: scheduled, refetch } = useScheduledNotifications();
  const { data: history, refetch: refetchHistory } = useNotificationHistory();
  const { data: rules } = useNotificationRules();
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
  const audLabel = (key: string) => audiences.find((a) => a.key === key)?.label ?? key;
  const audCount = (key: string) => audiences.find((a) => a.key === key)?.count ?? 0;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  const segs = ['Composer', `Programmées (${scheduled?.length ?? 0})`, 'Historique', `Récurrentes (${rules?.length ?? 0})`];

  const submit = () => {
    setError(null);
    send.mutate(
      { kind, title: title.trim(), body: body.trim(), audience, sendAt: later ? sendAt.toISOString() : undefined },
      {
        onSuccess: (r) => {
          setFlash(later ? `Notification programmée pour le ${fmtDate(sendAt.toISOString())}.` : `Envoyée à ${r.sentCount} adhérent(s).`);
          setTitle('');
          setBody('');
          setSeg(later ? 1 : 2);
        },
        onError: () => setError('La notification n’a pas pu être envoyée. Réessayez.'),
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
            <Text style={styles.pickTitle} numberOfLines={1}>{a.label}</Text>
            <Text style={styles.pickSub}>{a.count} adhérent{a.count > 1 ? 's' : ''}</Text>
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
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle title="Notifications" subtitle="Envoyer ou programmer une notification push" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {segs.map((l, i) => (
            <Pressable key={l} onPress={() => setSeg(i)} style={[styles.seg, seg === i && styles.segActive]}>
              <Text style={[styles.segText, seg === i && { color: colors.primaryContrast }]}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {flash ? <Banner tone="success" icon="check-circle-outline" text={flash} /> : null}
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        {seg === 0 ? (
          <>
            <Text style={styles.label}>Type</Text>
            <View style={styles.chips}>
              {KINDS.map((k) => (
                <Pressable key={k} onPress={() => setKind(k)} style={[styles.chip, kind === k && styles.chipActive]}>
                  <Text style={[styles.chipText, kind === k && { color: colors.primaryContrast }]}>{k}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.card, cardShadow]}>
              <TextField label="Titre" value={title} onChangeText={setTitle} placeholder="Titre de la notification" />
              <TextField label="Message" value={body} onChangeText={setBody} placeholder="Votre message" multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
            </View>

            <Text style={styles.label}>Destinataires</Text>
            <AudiencePicker value={audience} onChange={setAudience} />

            <Text style={styles.label}>Envoi</Text>
            <View style={styles.chips}>
              <Pressable onPress={() => setLater(false)} style={[styles.chip, !later && styles.chipActive]}>
                <Text style={[styles.chipText, !later && { color: colors.primaryContrast }]}>Maintenant</Text>
              </Pressable>
              <Pressable onPress={() => setLater(true)} style={[styles.chip, later && styles.chipActive]}>
                <Text style={[styles.chipText, later && { color: colors.primaryContrast }]}>Programmer</Text>
              </Pressable>
            </View>
            {later ? <DateTimeFields value={sendAt} onChange={setSendAt} minimumDate={new Date()} /> : null}

            <Text style={styles.label}>Aperçu sur l’écran adhérent</Text>
            <View style={[styles.preview, cardShadow]}>
              <View style={styles.previewHead}>
                <View style={styles.brand}><Text style={styles.brandText}>M</Text></View>
                <Text style={styles.previewWhen}>MuscleUP · {later ? fmtDate(sendAt.toISOString()) : 'maintenant'}</Text>
              </View>
              <Text style={styles.previewTitle}>{title || 'Titre de la notification'}</Text>
              <Text style={styles.previewBody}>{body || 'Le message apparaîtra ici.'}</Text>
              <Text style={styles.previewTo}>Sera envoyée à {audCount(audience)} adhérents · {audLabel(audience)}</Text>
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
                    <Text style={styles.cancelText}>Annuler</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {(scheduled ?? []).length === 0 ? <Empty icon="schedule-send" text="Aucune notification programmée." /> : null}
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
                  <Text style={styles.periodText}>{audLabel(n.audience)} · {n.sentCount} envois</Text>
                  <Text style={[styles.periodText, { color: colors.successInk }]}>{n.openRate} % ouvertes</Text>
                </View>
              </View>
            ))}
            {(history ?? []).length === 0 ? <Empty icon="history" text="Aucune notification envoyée pour le moment." /> : null}
          </View>
        ) : null}

        {seg === 3 ? (
          <View style={{ gap: 10 }}>
            <Pressable onPress={() => setRuleOpen((o) => !o)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
              <LinearGradient colors={ruleOpen ? [colors.surface, colors.surface] : [colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, ruleOpen && { borderWidth: 1, borderColor: colors.border }]}>
                <MaterialIcons name={ruleOpen ? 'close' : 'add'} size={22} color={ruleOpen ? colors.text : colors.primaryContrast} />
                <Text style={[styles.ctaText, ruleOpen && { color: colors.text }]}>{ruleOpen ? 'Fermer' : 'Nouvelle règle'}</Text>
              </LinearGradient>
            </Pressable>

            {ruleOpen ? (
              <View style={{ gap: 10 }}>
                <View style={[styles.card, cardShadow]}>
                  <TextField label="Titre" value={rTitle} onChangeText={setRTitle} placeholder="Ex. Votre abonnement expire bientôt" />
                  <TextField label="Message" value={rBody} onChangeText={setRBody} placeholder="Votre message" multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
                </View>
                <Text style={styles.label}>Destinataires</Text>
                <AudiencePicker value={rAudience} onChange={setRAudience} />
                <Text style={styles.label}>Condition d’envoi</Text>
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
                <Text style={styles.label}>Jours d’envoi</Text>
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
                <Text style={styles.label}>Heure d’envoi</Text>
                <DateTimeFields value={rTime} onChange={setRTime} timeOnly />
                <Text style={styles.periodText}>Chaque jour sélectionné à {hhmm(rTime)}</Text>
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
                    <Text style={styles.ctaText}>Créer la règle</Text>
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
                      {dayText(r.days)} à {r.time} · {audLabel(r.audience)}{r.condition !== 'NONE' ? ` · ${CONDITIONS.find((c) => c.key === r.condition)?.label}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteRule.mutate(r.id)} hitSlop={8}>
                    <MaterialIcons name="delete-outline" size={22} color={colors.dangerInk} />
                  </Pressable>
                </View>
              </View>
            ))}
            {(rules ?? []).length === 0 && !ruleOpen ? <Empty icon="repeat" text="Aucune règle récurrente." /> : null}
          </View>
        ) : null}
      </ScrollView>
      <StickyActionBar visible={seg === 0} label={later ? 'Programmer l’envoi' : 'Envoyer maintenant'} icon={later ? 'schedule-send' : 'send'} loading={send.isPending} disabled={!valid} onPress={submit} />
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
