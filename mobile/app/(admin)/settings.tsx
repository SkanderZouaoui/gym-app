import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import {
  DEFAULT_ATTENDANCE_POLICY,
  useAllClassTypes,
  useOrganizationConfig,
  useUpdateOrganizationConfig,
  type OrganizationConfig,
  useAdminRooms,
  useAttendancePolicy,
  useDeleteClassType,
  useDeleteRoom,
  useSaveClassType,
  useSaveRoom,
  useUpdateAttendancePolicy,
  type AttendancePolicy,
} from '../../src/hooks/useAdmin';
import { Banner, BottomSheet, ScreenTitle } from '../../src/components/ui';
import { TimeButton } from '../../src/components/ui/DateTimeFields';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { WEEKDAYS_LONG_MON } from '../../src/i18n/labels';
import { useLanguage } from '../../src/i18n/LanguageContext';

function Stepper({
  label, hint, value, unit, min = 0, max = 240, step = 5, onChange,
}: {
  label: string; hint?: string; value: number; unit: string; min?: number; max?: number; step?: number;
  onChange: (v: number) => void;
}) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} hitSlop={6} onPress={() => onChange(Math.max(min, value - step))}>
          <MaterialIcons name="remove" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.stepValue}>{value} <Text style={styles.stepUnit}>{unit}</Text></Text>
        <Pressable style={styles.stepBtn} hitSlop={6} onPress={() => onChange(Math.min(max, value + step))}>
          <MaterialIcons name="add" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
    </View>
  );
}

const DAY_NAMES = WEEKDAYS_LONG_MON;
const PAYMENTS: { key: keyof OrganizationConfig['paymentMethods']; label: string; sub: string }[] = [
  { key: 'CASH', get label() { return i18n.t('common.especes'); }, get sub() { return i18n.t('admin.encaissement_au_comptoir'); } },
  { key: 'OTHER', get label() { return i18n.t('common.carte'); }, get sub() { return i18n.t('admin.terminal_de_paiement'); } },
  { key: 'TRANSFER', get label() { return i18n.t('common.virement'); }, get sub() { return i18n.t('admin.sur_justificatif'); } },
  { key: 'CHECK', get label() { return i18n.t('common.cheque'); }, get sub() { return i18n.t('admin.a_lordre_de_la_salle'); } },
];

/** Champ de coordonnée : défini hors de SalleConfig pour garder la même identité (le clavier reste ouvert). */
function ConfigField({ icon, label, value, onChange, kb }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; onChange: (v: string) => void; kb?: 'default' | 'phone-pad' | 'email-address' }) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fieldIcon}>
        <MaterialIcons name={icon} size={22} color="#FFFFFF" />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
        <TextInput value={value} onChangeText={onChange} keyboardType={kb} autoCapitalize={kb ? 'none' : 'sentences'} placeholderTextColor={colors.muted} style={styles.fieldInput} />
      </View>
    </View>
  );
}

/** Réglages de la salle : coordonnées, horaires, paiements, annonces, réservation. */
type CfgPart = 'contact' | 'hours' | 'payments' | 'comms' | 'booking';

function SalleConfig({ cfg, patch, parts }: { cfg: OrganizationConfig; patch: (p: Partial<OrganizationConfig>) => void; parts: CfgPart[] }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const setHour = (i: number, p: Partial<OrganizationConfig['hours'][number]>) =>
    patch({ hours: cfg.hours.map((h, j) => (j === i ? { ...h, ...p } : h)) });

  return (
    <>
      {parts.includes('contact') ? (
        <>
      <Text style={styles.section}>{t('common.coordonnees')}</Text>
      <View style={[styles.card, cardShadow]}>
        <ConfigField icon="location-on" label={t('admin.adresse')} value={cfg.contact.address} onChange={(v) => patch({ contact: { ...cfg.contact, address: v } })} />
        <View style={styles.sep} />
        <ConfigField icon="call" label={t('common.telephone')} value={cfg.contact.phone} onChange={(v) => patch({ contact: { ...cfg.contact, phone: v } })} kb="phone-pad" />
        <View style={styles.sep} />
        <ConfigField icon="mail" label={t('common.email')} value={cfg.contact.email} onChange={(v) => patch({ contact: { ...cfg.contact, email: v } })} kb="email-address" />
        <View style={styles.sep} />
        <ToggleRow label={t('admin.visible_par_les_adherents')} hint={t('admin.affiche_dans_lapplication')} value={cfg.contact.visibleToMembers} onChange={(v) => patch({ contact: { ...cfg.contact, visibleToMembers: v } })} />
      </View>
        </>
      ) : null}
      {parts.includes('hours') ? (
        <>
      <Text style={styles.section}>{t('admin.horaires_douverture')}</Text>
      <View style={[styles.card, cardShadow]}>
        {cfg.hours.map((h, i) => (
          <View key={i}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <View style={styles.hourRow}>
              <View style={{ width: 86 }}>
                <Text style={styles.rowTitle}>{DAY_NAMES[i]}</Text>
                <Text style={[styles.rowHint, { color: h.open ? colors.successInk : colors.muted }]}>{h.open ? t('admin.ouvert') : t('admin.ferme')}</Text>
              </View>
              <View style={{ flex: 1 }}><TimeButton value={h.from} disabled={!h.open} onChange={(v) => setHour(i, { from: v })} /></View>
              <Text style={styles.rowHint}>–</Text>
              <View style={{ flex: 1 }}><TimeButton value={h.to} disabled={!h.open} onChange={(v) => setHour(i, { to: v })} /></View>
              <Switch value={h.open} onValueChange={(v) => setHour(i, { open: v })} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surface2} />
            </View>
          </View>
        ))}
      </View>
      <Pressable
        style={styles.copyBtn}
        onPress={() => patch({ hours: cfg.hours.map((h, i) => (i >= 1 && i <= 5 ? { ...cfg.hours[0] } : h)) })}
      >
        <MaterialIcons name="content-copy" size={16} color={colors.primaryInk} />
        <Text style={styles.addPillText}>{t('admin.copier_le_lundi_sur_mardi')}</Text>
      </Pressable>
        </>
      ) : null}
      {parts.includes('payments') ? (
        <>
      <Text style={styles.section}>{t('admin.moyens_de_paiement_acceptes')}</Text>
      <View style={[styles.card, cardShadow]}>
        {PAYMENTS.map((p, i) => (
          <View key={p.key}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <ToggleRow
              label={p.label}
              hint={p.sub}
              value={cfg.paymentMethods[p.key]}
              onChange={(v) => {
                const next = { ...cfg.paymentMethods, [p.key]: v };
                if (!Object.values(next).some(Boolean)) return;
                patch({ paymentMethods: next });
              }}
            />
          </View>
        ))}
      </View>
      <Text style={styles.section}>{t('admin.abonnements')}</Text>
      <Pressable style={[styles.card, cardShadow, styles.linkRow]} onPress={() => router.push('/(admin)/plans')}>
        <MaterialIcons name="card-membership" size={24} color={colors.primaryInk} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{t('admin.forfaits_et_tarifs')}</Text>
          <Text style={styles.rowHint}>{t('admin.tarifs_visibilite_et_remises_par')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
      </Pressable>
        </>
      ) : null}
      {parts.includes('comms') ? (
        <>
      <Text style={styles.section}>{t('admin.alertes_et_annonces')}</Text>
      <View style={[styles.card, cardShadow]}>
        <Stepper label={t('admin.rappel_dexpiration')} hint={t('admin.prevenir_avant_la_fin_de')} value={cfg.announcements.expiryReminderDays} unit="j" min={1} max={60} step={1} onChange={(v) => patch({ announcements: { ...cfg.announcements, expiryReminderDays: v } })} />
        <View style={styles.sep} />
        <View style={{ paddingVertical: 14, gap: 4 }}>
          <Text style={styles.rowTitle}>{t('admin.format_des_annonces')}</Text>
          <Text style={styles.rowHint}>{t('admin.affichage_sur_lecran_daccueil_adherent')}</Text>
          <View style={styles.formatRow}>
            {(['Bandeau', 'Pop-up', 'Encart'] as const).map((f) => (
              <Pressable key={f} onPress={() => patch({ announcements: { ...cfg.announcements, format: f } })} style={[styles.formatChip, cfg.announcements.format === f && styles.formatChipOn]}>
                <Text style={[styles.formatText, cfg.announcements.format === f && { color: colors.primaryContrast }]}>{t(`admin.format_${f === 'Pop-up' ? 'popup' : f.toLowerCase()}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.sep} />
        <View style={{ paddingVertical: 14, gap: 4 }}>
          <Text style={styles.rowTitle}>{t('admin.alert_format')}</Text>
          <Text style={styles.rowHint}>{t('admin.alert_format_hint')}</Text>
          <View style={styles.formatRow}>
            {(['Bandeau', 'Pop-up', 'Encart'] as const).map((f) => (
              <Pressable key={f} onPress={() => patch({ announcements: { ...cfg.announcements, alertFormat: f } })} style={[styles.formatChip, cfg.announcements.alertFormat === f && styles.formatChipOn]}>
                <Text style={[styles.formatText, cfg.announcements.alertFormat === f && { color: colors.primaryContrast }]}>{t(`admin.format_${f === 'Pop-up' ? 'popup' : f.toLowerCase()}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.sep} />
        <ToggleRow label={t('admin.notifications_push')} hint={t('admin.annonces_et_alertes_dexpiration')} value={cfg.announcements.push} onChange={(v) => patch({ announcements: { ...cfg.announcements, push: v } })} />
      </View>
        </>
      ) : null}
      {parts.includes('booking') ? (
        <>
      <Text style={styles.section}>{t('admin.reservation')}</Text>
      <View style={[styles.card, cardShadow]}>
        <Stepper label={t('admin.annulation_possible')} hint={t('admin.jusqua_avant_le_cours')} value={cfg.booking.cancelHoursBefore} unit="h" min={0} max={72} step={1} onChange={(v) => patch({ booking: { ...cfg.booking, cancelHoursBefore: v } })} />
        <View style={styles.sep} />
        <Stepper label={t('admin.capacite_par_defaut')} hint={t('admin.nouveaux_cours')} value={cfg.booking.defaultCapacity} unit="pl." min={1} max={200} step={1} onChange={(v) => patch({ booking: { ...cfg.booking, defaultCapacity: v } })} />
        <View style={styles.sep} />
        <ToggleRow label={t('common.liste_dattente')} hint={t('admin.quand_un_cours_est_complet')} value={cfg.booking.waitlist} onChange={(v) => patch({ booking: { ...cfg.booking, waitlist: v } })} />
      </View>
        </>
      ) : null}
    </>
  );
}

type CatalogEdit =
  | { kind: 'type'; id?: string; name: string; capacity: string; duration: string }
  | { kind: 'room'; id?: string; name: string; capacity: string };

/** Types de cours et salles : liste, ajout, modification, suppression. */
function Catalog() {
  useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: types } = useAllClassTypes();
  const { data: rooms } = useAdminRooms();
  const saveType = useSaveClassType();
  const saveRoom = useSaveRoom();
  const delType = useDeleteClassType();
  const delRoom = useDeleteRoom();
  const [edit, setEdit] = useState<CatalogEdit | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'type' | 'room'; id: string; name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = saveType.isPending || saveRoom.isPending;
  const canSave = !!edit && edit.name.trim().length > 0 && Number(edit.capacity) >= 1;

  const save = () => {
    if (!edit) return;
    setError(null);
    const done = { onSuccess: () => setEdit(null), onError: () => setError(i18n.t('admin.enregistrement_impossible_reessayez')) };
    if (edit.kind === 'type') {
      saveType.mutate({ id: edit.id, name: edit.name.trim(), defaultCapacity: Number(edit.capacity), defaultDurationMin: Number(edit.duration) || 45 }, done);
    } else {
      saveRoom.mutate({ id: edit.id, name: edit.name.trim(), capacity: Number(edit.capacity) }, done);
    }
  };

  const remove = () => {
    if (!confirm) return;
    const settle = { onSettled: () => setConfirm(null) };
    if (confirm.kind === 'type') {
      delType.mutate(confirm.id, {
        ...settle,
        onSuccess: (r) => setMessage(r.deactivated ? i18n.t('admin.est_utilise_par_des_cours', { name: confirm.name }) : i18n.t('admin.supprime', { name: confirm.name })),
      });
    } else {
      delRoom.mutate(confirm.id, {
        ...settle,
        onSuccess: () => setMessage(i18n.t('admin.supprimee', { name: confirm.name })),
        onError: () => setMessage(i18n.t('admin.est_utilisee_par_des_cours', { name: confirm.name })),
      });
    }
  };

  const Row = ({ title, sub, onEdit, onDelete, muted }: { title: string; sub: string; onEdit: () => void; onDelete: () => void; muted?: boolean }) => (
    <View style={[styles.row, muted && { opacity: 0.55 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowHint}>{sub}</Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
        <MaterialIcons name="edit" size={18} color={colors.primaryInk} />
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.dangerSoft }]}>
        <MaterialIcons name="delete-outline" size={18} color={colors.dangerInk} />
      </Pressable>
    </View>
  );

  return (
    <>
      {message ? <Banner tone="info" icon="info-outline" text={message} /> : null}

      <View style={styles.catHead}>
        <Text style={styles.section}>{i18n.t('admin.types_de_cours')}</Text>
        <Pressable style={styles.addPill} onPress={() => setEdit({ kind: 'type', name: '', capacity: '16', duration: '45' })}>
          <MaterialIcons name="add" size={18} color={colors.primaryInk} />
          <Text style={styles.addPillText}>{i18n.t('admin.ajouter')}</Text>
        </Pressable>
      </View>
      <View style={[styles.card, cardShadow]}>
        {(types ?? []).map((t, i) => (
          <View key={t.id}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <Row
              title={t.name}
              sub={i18n.t('admin.min_places_2', { defaultDurationMin: t.defaultDurationMin, defaultCapacity: t.defaultCapacity, v2: t.isActive ? '' : i18n.t('admin.desactive_2') })}
              muted={!t.isActive}
              onEdit={() => setEdit({ kind: 'type', id: t.id, name: t.name, capacity: String(t.defaultCapacity), duration: String(t.defaultDurationMin) })}
              onDelete={() => setConfirm({ kind: 'type', id: t.id, name: t.name })}
            />
          </View>
        ))}
        {(types ?? []).length === 0 ? <Text style={styles.emptyRow}>{i18n.t('admin.aucun_type_de_cours')}</Text> : null}
      </View>

      <View style={styles.catHead}>
        <Text style={styles.section}>{i18n.t('admin.salles')}</Text>
        <Pressable style={styles.addPill} onPress={() => setEdit({ kind: 'room', name: '', capacity: '20' })}>
          <MaterialIcons name="add" size={18} color={colors.primaryInk} />
          <Text style={styles.addPillText}>{i18n.t('admin.ajouter')}</Text>
        </Pressable>
      </View>
      <View style={[styles.card, cardShadow]}>
        {(rooms ?? []).map((r, i) => (
          <View key={r.id}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <Row
              title={r.name}
              sub={`${r.capacity} places`}
              onEdit={() => setEdit({ kind: 'room', id: r.id, name: r.name, capacity: String(r.capacity) })}
              onDelete={() => setConfirm({ kind: 'room', id: r.id, name: r.name })}
            />
          </View>
        ))}
        {(rooms ?? []).length === 0 ? <Text style={styles.emptyRow}>{i18n.t('admin.aucune_salle_2')}</Text> : null}
      </View>

      <BottomSheet visible={!!edit} onClose={() => setEdit(null)}>
        <Text style={styles.sheetTitle}>
          {edit?.id ? i18n.t('profile.edit') : i18n.t('home.announcementNew')} {edit?.kind === 'type' ? i18n.t('admin.type_de_cours_2') : 'salle'}
        </Text>
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}
        <TextField label={i18n.t('common.nom')} value={edit?.name ?? ''} onChangeText={(v) => edit && setEdit({ ...edit, name: v })} placeholder={edit?.kind === 'type' ? i18n.t('admin.ex_cross_training') : i18n.t('admin.ex_studio_b')} />
        <TextField
          label={i18n.t('admin.capacite_places')}
          value={edit?.capacity ?? ''}
          onChangeText={(v) => edit && setEdit({ ...edit, capacity: v.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
        />
        {edit?.kind === 'type' ? (
          <TextField
            label={i18n.t('admin.duree_minutes')}
            value={edit.duration}
            onChangeText={(v) => setEdit({ ...edit, duration: v.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
          />
        ) : null}
        <Button label={busy ? i18n.t('common.enregistrement') : i18n.t('member.enregistrer')} onPress={save} disabled={!canSave || busy} />
      </BottomSheet>

      <BottomSheet visible={!!confirm} onClose={() => setConfirm(null)}>
        <Text style={styles.sheetTitle}>{i18n.t('common.supprimer_2', { name: confirm?.name })}</Text>
        <Text style={styles.sheetText}>
          {confirm?.kind === 'type'
            ? i18n.t('admin.sil_est_deja_utilise_par')
            : i18n.t('admin.une_salle_utilisee_par_des')}
        </Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Button label={i18n.t('admin.oui_supprimer')} variant="secondary" onPress={remove} loading={delType.isPending || delRoom.isPending} />
          <Button label={i18n.t('common.annuler')} variant="outline" onPress={() => setConfirm(null)} />
        </View>
      </BottomSheet>
    </>
  );
}

/** Configuration (admin) : période de scan et règles de présence. */
type Section = 'venue' | 'classes' | 'booking' | 'payments' | 'comms' | 'language';

/** Réglages de la salle, répartis en pages dédiées (paramètre `section`) ; sans paramètre, tout est affiché. */
export default function AdminSettingsScreen() {
  const { section } = useLocalSearchParams<{ section?: Section }>();
  const show = (...names: Section[]) => !section || names.includes(section);
  const cfgParts: CfgPart[] = !section
    ? ['contact', 'hours', 'payments', 'comms', 'booking']
    : section === 'venue'
      ? ['contact', 'hours']
      : section === 'payments'
        ? ['payments']
        : section === 'comms'
          ? ['comms']
          : section === 'booking'
            ? ['booking']
            : [];
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data } = useAttendancePolicy();
  const update = useUpdateAttendancePolicy();
  const { data: orgData } = useOrganizationConfig();
  const updateOrg = useUpdateOrganizationConfig();
  const [cfg, setCfg] = useState<OrganizationConfig | null>(null);
  const [cfgDirty, setCfgDirty] = useState(false);
  const [policy, setPolicy] = useState<AttendancePolicy>(DEFAULT_ATTENDANCE_POLICY);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  useEffect(() => {
    if (data && !dirty) setPolicy(data);
  }, [data, dirty]);
  useEffect(() => {
    if (orgData && !cfgDirty) setCfg(orgData);
  }, [orgData, cfgDirty]);

  const patchCfg = (p: Partial<OrganizationConfig>) => {
    setCfg((cur) => (cur ? { ...cur, ...p } : cur));
    setCfgDirty(true);
    setSaved(false);
  };

  const patch = (p: Partial<AttendancePolicy>) => {
    setPolicy((cur) => ({ ...cur, ...p }));
    setDirty(true);
    setSaved(false);
  };
  const patchPenalty = (p: Partial<AttendancePolicy['noShowPenalty']>) =>
    patch({ noShowPenalty: { ...policy.noShowPenalty, ...p } });

  const anyDirty = dirty || cfgDirty;
  const saving = update.isPending || updateOrg.isPending;
  const [saveError, setSaveError] = useState(false);

  const save = async () => {
    setSaveError(false);
    try {
      if (dirty) await update.mutateAsync(policy);
      if (cfgDirty && cfg) await updateOrg.mutateAsync(cfg);
      setDirty(false);
      setCfgDirty(false);
      setSaved(true);
    } catch {
      setSaveError(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, anyDirty && { paddingBottom: 130 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.plus')}</Text>
        </Pressable>
        <ScreenTitle
          title={section ? t(`admin.cfg_${section}`) : t('admin.configuration')}
          subtitle={section ? t(`admin.cfg_${section}_sub`) : t('admin.cours_salles_periode_de_scan')}
        />

        {cfg && cfgParts.length > 0 ? <SalleConfig cfg={cfg} patch={patchCfg} parts={cfgParts} /> : null}

        {show('classes') ? <Catalog /> : null}

        {section === 'language' || !section ? <LanguageSection /> : null}

        {show('booking') ? (
          <>
        <Text style={styles.section}>{t('admin.periode_de_scan')}</Text>
        <View style={[styles.card, cardShadow]}>
          <Stepper
            label={t('admin.ouverture_avant_le_cours')}
            hint={t('admin.le_pointage_souvre_avant_le')}
            value={policy.scanOpensMinutesBefore}
            unit="min"
            onChange={(v) => patch({ scanOpensMinutesBefore: v })}
          />
          <View style={styles.sep} />
          <Stepper
            label={t('admin.fermeture_apres_le_debut')}
            hint={t('admin.au_dela_le_scan_est')}
            value={policy.scanClosesMinutesAfterStart}
            unit="min"
            onChange={(v) => patch({ scanClosesMinutesAfterStart: v })}
          />
        </View>
        <Text style={styles.preview}>{t('admin.exemple_pour_un_cours_a', { v1: clock(18 * 60 - policy.scanOpensMinutesBefore), v3: ' ', v5: clock(18 * 60 + policy.scanClosesMinutesAfterStart) })}</Text>

        <Text style={styles.section}>{t('admin.presence')}</Text>
        <View style={[styles.card, cardShadow]}>
          <ToggleRow
            label={t('admin.accepter_sans_reservation')}
            hint={t('admin.pointer_un_adherent_qui_na')}
            value={policy.allowWalkIn}
            onChange={(v) => patch({ allowWalkIn: v })}
          />
          <View style={styles.sep} />
          <Stepper
            label={t('admin.delai_avant_absence')}
            hint={t('admin.apres_le_debut_une_reservation')}
            value={policy.noShowGraceMinutes}
            unit="min"
            onChange={(v) => patch({ noShowGraceMinutes: v })}
          />
          <View style={styles.sep} />
          <ToggleRow
            label={t('admin.laccueil_peut_encaisser')}
            hint={t('admin.autoriser_le_personnel_daccueil_a')}
            value={policy.staffCanRecordPayments}
            onChange={(v) => patch({ staffCanRecordPayments: v })}
          />
        </View>

        <Text style={styles.section}>{t('admin.penalite_dabsence')}</Text>
        <View style={[styles.card, cardShadow]}>
          <ToggleRow
            label={t('admin.bloquer_les_reservations')}
            hint={t('admin.apres_plusieurs_absences_ladherent_ne')}
            value={policy.noShowPenalty.enabled}
            onChange={(v) => patchPenalty({ enabled: v })}
          />
          {policy.noShowPenalty.enabled ? (
            <>
              <View style={styles.sep} />
              <Stepper label={t('admin.nombre_dabsences')} value={policy.noShowPenalty.threshold} unit="abs." min={1} max={20} step={1} onChange={(v) => patchPenalty({ threshold: v })} />
              <View style={styles.sep} />
              <Stepper label={t('admin.sur_une_periode_de')} value={policy.noShowPenalty.windowDays} unit="jours" min={1} max={365} step={5} onChange={(v) => patchPenalty({ windowDays: v })} />
              <View style={styles.sep} />
              <Stepper label={t('admin.blocage_pendant')} value={policy.noShowPenalty.blockBookingDays} unit="jours" min={1} max={90} step={1} onChange={(v) => patchPenalty({ blockBookingDays: v })} />
            </>
          ) : null}
        </View>

          </>
        ) : null}

        {saveError ? <Banner tone="danger" icon="error-outline" title={t('admin.enregistrement_impossible')} text={t('admin.verifiez_la_connexion_et_gardez')} /> : null}
        {saved && !anyDirty ? <Banner tone="success" icon="check-circle-outline" title={t('admin.configuration_enregistree')} text={t('admin.les_nouvelles_regles_sappliquent_immediatement')} /> : null}
      </ScrollView>

      {anyDirty ? (
        <View style={styles.stickyBar}>
          <Pressable onPress={save} disabled={saving} style={({ pressed }) => [saving && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
              <Text style={styles.saveText}>{saving ? t('common.enregistrement') : t('common.enregistrer_les_modifications')}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** Langue de l'application : choix immédiat (français, anglais, arabe). */
function LanguageSection() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { language, setLanguage } = useLanguage();
  return (
    <>
      <Text style={styles.section}>{t('common.langue')}</Text>
      <View style={[styles.card, cardShadow]}>
        {SUPPORTED_LANGUAGES.map((code, i) => (
          <View key={code}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <Pressable style={styles.row} onPress={() => setLanguage(code)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{LANGUAGE_LABELS[code]}</Text>
              </View>
              {language === code ? <MaterialIcons name="check-circle" size={24} color={colors.primary} /> : <MaterialIcons name="radio-button-unchecked" size={24} color={colors.muted} />}
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={styles.rowHint}>{t('admin.cfg_language_hint')}</Text>
    </>
  );
}

function clock(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    section: { fontFamily: fonts.headSemiBold, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginTop: 4 },
    card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
    rowHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
    sep: { height: 1, backgroundColor: colors.border },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface2, borderRadius: 14, padding: 4 },
    stepBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    stepValue: { minWidth: 62, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    stepUnit: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    preview: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: colors.muted, marginHorizontal: 4, marginTop: -4 },
    fieldIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.muted },
    fieldInput: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text, paddingVertical: 2 },
    hourRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
    copyBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.primarySoft },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    formatRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    formatChip: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    formatChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    formatText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
    stickyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
    catHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    addPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: colors.primarySoft },
    addPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    emptyRow: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, paddingVertical: 16 },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
    save: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
  });
}
