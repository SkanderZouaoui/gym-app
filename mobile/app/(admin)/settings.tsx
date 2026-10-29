import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
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

function Stepper({
  label, hint, value, unit, min = 0, max = 240, step = 5, onChange,
}: {
  label: string; hint?: string; value: number; unit: string; min?: number; max?: number; step?: number;
  onChange: (v: number) => void;
}) {
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

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const PAYMENTS: { key: keyof OrganizationConfig['paymentMethods']; label: string; sub: string }[] = [
  { key: 'CASH', label: 'Espèces', sub: 'Encaissement au comptoir' },
  { key: 'OTHER', label: 'Carte', sub: 'Terminal de paiement' },
  { key: 'TRANSFER', label: 'Virement', sub: 'Sur justificatif' },
  { key: 'CHECK', label: 'Chèque', sub: 'À l’ordre de la salle' },
];

/** Champ de coordonnée : défini hors de SalleConfig pour garder la même identité (le clavier reste ouvert). */
function ConfigField({ icon, label, value, onChange, kb }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; onChange: (v: string) => void; kb?: 'default' | 'phone-pad' | 'email-address' }) {
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
function SalleConfig({ cfg, patch }: { cfg: OrganizationConfig; patch: (p: Partial<OrganizationConfig>) => void }) {
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const setHour = (i: number, p: Partial<OrganizationConfig['hours'][number]>) =>
    patch({ hours: cfg.hours.map((h, j) => (j === i ? { ...h, ...p } : h)) });

  return (
    <>
      <Text style={styles.section}>Coordonnées</Text>
      <View style={[styles.card, cardShadow]}>
        <ConfigField icon="location-on" label="Adresse" value={cfg.contact.address} onChange={(v) => patch({ contact: { ...cfg.contact, address: v } })} />
        <View style={styles.sep} />
        <ConfigField icon="call" label="Téléphone" value={cfg.contact.phone} onChange={(v) => patch({ contact: { ...cfg.contact, phone: v } })} kb="phone-pad" />
        <View style={styles.sep} />
        <ConfigField icon="mail" label="Email" value={cfg.contact.email} onChange={(v) => patch({ contact: { ...cfg.contact, email: v } })} kb="email-address" />
        <View style={styles.sep} />
        <ToggleRow label="Visible par les adhérents" hint="Affiché dans l’application" value={cfg.contact.visibleToMembers} onChange={(v) => patch({ contact: { ...cfg.contact, visibleToMembers: v } })} />
      </View>

      <Text style={styles.section}>Horaires d’ouverture</Text>
      <View style={[styles.card, cardShadow]}>
        {cfg.hours.map((h, i) => (
          <View key={i}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <View style={styles.hourRow}>
              <View style={{ width: 86 }}>
                <Text style={styles.rowTitle}>{DAY_NAMES[i]}</Text>
                <Text style={[styles.rowHint, { color: h.open ? colors.successInk : colors.muted }]}>{h.open ? 'Ouvert' : 'Fermé'}</Text>
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
        <Text style={styles.addPillText}>Copier le lundi sur mardi – samedi</Text>
      </Pressable>

      <Text style={styles.section}>Abonnements</Text>
      <Pressable style={[styles.card, cardShadow, styles.linkRow]} onPress={() => router.push('/(admin)/plans')}>
        <MaterialIcons name="card-membership" size={24} color={colors.primaryInk} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Forfaits et tarifs</Text>
          <Text style={styles.rowHint}>Tarifs, visibilité et remises par durée</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
      </Pressable>

      <Text style={styles.section}>Moyens de paiement acceptés</Text>
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

      <Text style={styles.section}>Alertes et annonces</Text>
      <View style={[styles.card, cardShadow]}>
        <Stepper label="Rappel d’expiration" hint="Prévenir avant la fin de l’abonnement" value={cfg.announcements.expiryReminderDays} unit="j" min={1} max={60} step={1} onChange={(v) => patch({ announcements: { ...cfg.announcements, expiryReminderDays: v } })} />
        <View style={styles.sep} />
        <View style={{ paddingVertical: 14, gap: 4 }}>
          <Text style={styles.rowTitle}>Format des annonces</Text>
          <Text style={styles.rowHint}>Affichage sur l’écran d’accueil adhérent</Text>
          <View style={styles.formatRow}>
            {(['Bandeau', 'Pop-up', 'Encart'] as const).map((f) => (
              <Pressable key={f} onPress={() => patch({ announcements: { ...cfg.announcements, format: f } })} style={[styles.formatChip, cfg.announcements.format === f && styles.formatChipOn]}>
                <Text style={[styles.formatText, cfg.announcements.format === f && { color: colors.primaryContrast }]}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.sep} />
        <ToggleRow label="Notifications push" hint="Annonces et alertes d’expiration" value={cfg.announcements.push} onChange={(v) => patch({ announcements: { ...cfg.announcements, push: v } })} />
      </View>

      <Text style={styles.section}>Réservation</Text>
      <View style={[styles.card, cardShadow]}>
        <Stepper label="Annulation possible" hint="Jusqu’à avant le cours" value={cfg.booking.cancelHoursBefore} unit="h" min={0} max={72} step={1} onChange={(v) => patch({ booking: { ...cfg.booking, cancelHoursBefore: v } })} />
        <View style={styles.sep} />
        <Stepper label="Capacité par défaut" hint="Nouveaux cours" value={cfg.booking.defaultCapacity} unit="pl." min={1} max={200} step={1} onChange={(v) => patch({ booking: { ...cfg.booking, defaultCapacity: v } })} />
        <View style={styles.sep} />
        <ToggleRow label="Liste d’attente" hint="Quand un cours est complet" value={cfg.booking.waitlist} onChange={(v) => patch({ booking: { ...cfg.booking, waitlist: v } })} />
      </View>
    </>
  );
}

type CatalogEdit =
  | { kind: 'type'; id?: string; name: string; capacity: string; duration: string }
  | { kind: 'room'; id?: string; name: string; capacity: string };

/** Types de cours et salles : liste, ajout, modification, suppression. */
function Catalog() {
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
    const done = { onSuccess: () => setEdit(null), onError: () => setError('Enregistrement impossible. Réessayez.') };
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
        onSuccess: (r) => setMessage(r.deactivated ? `« ${confirm.name} » est utilisé par des cours : il est désactivé et n’apparaît plus dans les choix.` : `« ${confirm.name} » supprimé.`),
      });
    } else {
      delRoom.mutate(confirm.id, {
        ...settle,
        onSuccess: () => setMessage(`« ${confirm.name} » supprimée.`),
        onError: () => setMessage(`« ${confirm.name} » est utilisée par des cours : elle ne peut pas être supprimée.`),
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
        <Text style={styles.section}>Types de cours</Text>
        <Pressable style={styles.addPill} onPress={() => setEdit({ kind: 'type', name: '', capacity: '16', duration: '45' })}>
          <MaterialIcons name="add" size={18} color={colors.primaryInk} />
          <Text style={styles.addPillText}>Ajouter</Text>
        </Pressable>
      </View>
      <View style={[styles.card, cardShadow]}>
        {(types ?? []).map((t, i) => (
          <View key={t.id}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <Row
              title={t.name}
              sub={`${t.defaultDurationMin} min · ${t.defaultCapacity} places${t.isActive ? '' : ' · désactivé'}`}
              muted={!t.isActive}
              onEdit={() => setEdit({ kind: 'type', id: t.id, name: t.name, capacity: String(t.defaultCapacity), duration: String(t.defaultDurationMin) })}
              onDelete={() => setConfirm({ kind: 'type', id: t.id, name: t.name })}
            />
          </View>
        ))}
        {(types ?? []).length === 0 ? <Text style={styles.emptyRow}>Aucun type de cours.</Text> : null}
      </View>

      <View style={styles.catHead}>
        <Text style={styles.section}>Salles</Text>
        <Pressable style={styles.addPill} onPress={() => setEdit({ kind: 'room', name: '', capacity: '20' })}>
          <MaterialIcons name="add" size={18} color={colors.primaryInk} />
          <Text style={styles.addPillText}>Ajouter</Text>
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
        {(rooms ?? []).length === 0 ? <Text style={styles.emptyRow}>Aucune salle.</Text> : null}
      </View>

      <BottomSheet visible={!!edit} onClose={() => setEdit(null)}>
        <Text style={styles.sheetTitle}>
          {edit?.id ? 'Modifier' : 'Nouveau'} {edit?.kind === 'type' ? 'type de cours' : 'salle'}
        </Text>
        {error ? <Banner tone="danger" icon="error" text={error} /> : null}
        <TextField label="Nom" value={edit?.name ?? ''} onChangeText={(v) => edit && setEdit({ ...edit, name: v })} placeholder={edit?.kind === 'type' ? 'Ex. Cross training' : 'Ex. Studio B'} />
        <TextField
          label="Capacité (places)"
          value={edit?.capacity ?? ''}
          onChangeText={(v) => edit && setEdit({ ...edit, capacity: v.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
        />
        {edit?.kind === 'type' ? (
          <TextField
            label="Durée (minutes)"
            value={edit.duration}
            onChangeText={(v) => setEdit({ ...edit, duration: v.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
          />
        ) : null}
        <Button label={busy ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={!canSave || busy} />
      </BottomSheet>

      <BottomSheet visible={!!confirm} onClose={() => setConfirm(null)}>
        <Text style={styles.sheetTitle}>Supprimer « {confirm?.name} » ?</Text>
        <Text style={styles.sheetText}>
          {confirm?.kind === 'type'
            ? 'S’il est déjà utilisé par des cours, il sera simplement désactivé.'
            : 'Une salle utilisée par des cours ne peut pas être supprimée.'}
        </Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Button label="Oui, supprimer" variant="secondary" onPress={remove} loading={delType.isPending || delRoom.isPending} />
          <Button label="Annuler" variant="outline" onPress={() => setConfirm(null)} />
        </View>
      </BottomSheet>
    </>
  );
}

/** Configuration (admin) : période de scan et règles de présence. */
export default function AdminSettingsScreen() {
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
          <Text style={styles.backText}>Plus</Text>
        </Pressable>
        <ScreenTitle title="Configuration" subtitle="Cours, salles, période de scan et règles" />

        {cfg ? <SalleConfig cfg={cfg} patch={patchCfg} /> : null}

        <Catalog />

        <Text style={styles.section}>Période de scan</Text>
        <View style={[styles.card, cardShadow]}>
          <Stepper
            label="Ouverture avant le cours"
            hint="Le pointage s’ouvre avant le début"
            value={policy.scanOpensMinutesBefore}
            unit="min"
            onChange={(v) => patch({ scanOpensMinutesBefore: v })}
          />
          <View style={styles.sep} />
          <Stepper
            label="Fermeture après le début"
            hint="Au-delà, le scan est refusé"
            value={policy.scanClosesMinutesAfterStart}
            unit="min"
            onChange={(v) => patch({ scanClosesMinutesAfterStart: v })}
          />
        </View>
        <Text style={styles.preview}>
          Exemple : pour un cours à 18:00, on peut pointer de {clock(18 * 60 - policy.scanOpensMinutesBefore)} à{' '}
          {clock(18 * 60 + policy.scanClosesMinutesAfterStart)}.
        </Text>

        <Text style={styles.section}>Présence</Text>
        <View style={[styles.card, cardShadow]}>
          <ToggleRow
            label="Accepter sans réservation"
            hint="Pointer un adhérent qui n’a pas réservé"
            value={policy.allowWalkIn}
            onChange={(v) => patch({ allowWalkIn: v })}
          />
          <View style={styles.sep} />
          <Stepper
            label="Délai avant absence"
            hint="Après le début, une réservation non pointée devient une absence"
            value={policy.noShowGraceMinutes}
            unit="min"
            onChange={(v) => patch({ noShowGraceMinutes: v })}
          />
          <View style={styles.sep} />
          <ToggleRow
            label="L’accueil peut encaisser"
            hint="Autoriser le personnel d’accueil à enregistrer des paiements"
            value={policy.staffCanRecordPayments}
            onChange={(v) => patch({ staffCanRecordPayments: v })}
          />
        </View>

        <Text style={styles.section}>Pénalité d’absence</Text>
        <View style={[styles.card, cardShadow]}>
          <ToggleRow
            label="Bloquer les réservations"
            hint="Après plusieurs absences, l’adhérent ne peut plus réserver un moment"
            value={policy.noShowPenalty.enabled}
            onChange={(v) => patchPenalty({ enabled: v })}
          />
          {policy.noShowPenalty.enabled ? (
            <>
              <View style={styles.sep} />
              <Stepper label="Nombre d’absences" value={policy.noShowPenalty.threshold} unit="abs." min={1} max={20} step={1} onChange={(v) => patchPenalty({ threshold: v })} />
              <View style={styles.sep} />
              <Stepper label="Sur une période de" value={policy.noShowPenalty.windowDays} unit="jours" min={1} max={365} step={5} onChange={(v) => patchPenalty({ windowDays: v })} />
              <View style={styles.sep} />
              <Stepper label="Blocage pendant" value={policy.noShowPenalty.blockBookingDays} unit="jours" min={1} max={90} step={1} onChange={(v) => patchPenalty({ blockBookingDays: v })} />
            </>
          ) : null}
        </View>

        {saveError ? <Banner tone="danger" icon="error-outline" title="Enregistrement impossible" text="Vérifiez la connexion (et gardez au moins un moyen de paiement)." /> : null}
        {saved && !anyDirty ? <Banner tone="success" icon="check-circle-outline" title="Configuration enregistrée" text="Les nouvelles règles s’appliquent immédiatement." /> : null}
      </ScrollView>

      {anyDirty ? (
        <View style={styles.stickyBar}>
          <Pressable onPress={save} disabled={saving} style={({ pressed }) => [saving && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
              <Text style={styles.saveText}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
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
