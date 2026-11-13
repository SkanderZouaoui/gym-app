import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { BottomSheet, Banner, EmptyState, ScreenTitle, SkeletonList, Toast } from '../../src/components/ui';
import { Button } from '../../src/components/Button';
import { ProfileField } from '../../src/components/ProfileField';
import { useOfflineAwareRefresh } from '../../src/hooks/useOfflineAwareRefresh';
import { BADGE_ICONS, BADGE_RULES, BADGE_RULE_MAX, useAdminBadges, useDeleteBadge, useReorderBadges, useSaveBadge, type AdminBadge } from '../../src/hooks/useAdminBadges';
import type { BadgeRule } from '../../src/hooks/useProfileBadges';
import { haptics } from '../../src/utils/haptics';

type IconName = keyof typeof MaterialIcons.glyphMap;

/** Badges du profil (admin) : nom, icône, règle d'obtention et ordre des badges affichés aux adhérents. */
export default function AdminBadgesScreen() {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading, refetch } = useAdminBadges();
  const reorder = useReorderBadges();
  const save = useSaveBadge();
  const remove = useDeleteBadge();
  const { refreshing, onRefresh } = useOfflineAwareRefresh(refetch);
  const [editing, setEditing] = useState<AdminBadge | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminBadge | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const list = data ?? [];

  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  };
  const ruleText = (rule: BadgeRule, n: number) => `${t(`admin.badge_rule_${rule}`)} : ${n} ${t(`admin.badge_unit_${rule}`)}`;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/more'));

  const move = (index: number, dir: -1 | 1) => {
    const ids = list.map((b) => b.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    haptics.selection();
    reorder.mutate(ids);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{t('common.plus')}</Text>
        </Pressable>
        <ScreenTitle title={t('admin.badges_title')} subtitle={t('admin.badges_sub')} />

        <Pressable onPress={() => setEditing('new')} accessibilityRole="button" style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}>
          <MaterialIcons name="add" size={22} color={colors.primaryInk} />
          <Text style={styles.addText}>{t('admin.badges_new')}</Text>
        </Pressable>

        {isLoading && !data ? (
          <SkeletonList count={4} height={84} />
        ) : list.length === 0 ? (
          <EmptyState icon="military-tech" title={t('admin.badges_empty_title')} text={t('admin.badges_empty_text')} tone="muted" />
        ) : (
          list.map((b, i) => (
            <View key={b.id} style={[styles.card, cardShadow, !b.isActive && { opacity: 0.65 }]}>
              <Pressable style={styles.cardMain} onPress={() => setEditing(b)} accessibilityRole="button">
                <LinearGradient colors={[colors.deep, colors.deepPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
                  <MaterialIcons name={b.icon as IconName} size={26} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{b.labelFr}</Text>
                  <Text style={styles.cardMeta} numberOfLines={2}>{ruleText(b.rule, b.threshold)}</Text>
                </View>
              </Pressable>
              <View style={styles.arrows}>
                <Pressable onPress={() => move(i, -1)} disabled={i === 0 || reorder.isPending} hitSlop={6} style={[styles.arrow, i === 0 && { opacity: 0.3 }]} accessibilityLabel="up">
                  <MaterialIcons name="keyboard-arrow-up" size={22} color={colors.text} />
                </Pressable>
                <Pressable onPress={() => move(i, 1)} disabled={i === list.length - 1 || reorder.isPending} hitSlop={6} style={[styles.arrow, i === list.length - 1 && { opacity: 0.3 }]} accessibilityLabel="down">
                  <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.text} />
                </Pressable>
              </View>
              <Switch
                value={b.isActive}
                onValueChange={(v) => save.mutate({ id: b.id, isActive: v })}
                trackColor={{ true: colors.deep, false: colors.surface2 }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))
        )}
      </ScrollView>

      {editing ? (
        <BadgeSheet
          item={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(created) => { setEditing(null); notify(created ? t('admin.badges_new') : t('common.enregistrer')); }}
          onDelete={(b) => { setEditing(null); setConfirmDelete(b); }}
        />
      ) : null}

      <BottomSheet visible={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <View style={styles.confirmIcon}>
          <MaterialIcons name="delete-outline" size={30} color={colors.dangerInk} />
        </View>
        <Text style={styles.confirmTitle}>{t('admin.badge_delete_title')}</Text>
        <Text style={styles.confirmText}>{confirmDelete?.labelFr} — {t('admin.badge_delete_text')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={t('member.supprimer')}
            variant="danger"
            loading={remove.isPending}
            onPress={() => confirmDelete && remove.mutate(confirmDelete.id, { onSettled: () => setConfirmDelete(null) })}
          />
          <Button label={t('common.annuler')} variant="outline" onPress={() => setConfirmDelete(null)} />
        </View>
      </BottomSheet>

      {toast ? <Toast icon="check-circle" text={toast} iconColor={colors.success} /> : null}
    </SafeAreaView>
  );
}

function BadgeSheet({ item, onClose, onSaved, onDelete }: { item?: AdminBadge; onClose: () => void; onSaved: (created: boolean) => void; onDelete: (b: AdminBadge) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const save = useSaveBadge();
  const [labelFr, setLabelFr] = useState(item?.labelFr ?? '');
  const [labelEn, setLabelEn] = useState(item?.labelEn ?? '');
  const [labelAr, setLabelAr] = useState(item?.labelAr ?? '');
  const [icon, setIcon] = useState<string>(item?.icon ?? 'emoji-events');
  const [rule, setRule] = useState<BadgeRule>(item?.rule ?? 'SESSIONS');
  const [threshold, setThreshold] = useState(String(item?.threshold ?? 10));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const n = Number(threshold);
  const valid = labelFr.trim().length > 0 && n >= 1 && n <= BADGE_RULE_MAX[rule];

  const submit = () => {
    setError(null);
    save.mutate(
      { id: item?.id, labelFr: labelFr.trim(), labelEn: labelEn.trim() || null, labelAr: labelAr.trim() || null, icon, rule, threshold: n, isActive },
      { onSuccess: () => onSaved(!item), onError: () => setError(t('admin.badge_save_error')) },
    );
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <Text style={styles.sheetTitle}>{item ? t('admin.badges_edit') : t('admin.badges_new')}</Text>
      {error ? <Banner tone="danger" icon="error" text={error} /> : null}

      <View style={styles.preview}>
        <LinearGradient colors={[colors.deep, colors.deepPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
          <MaterialIcons name={icon as IconName} size={26} color="#FFFFFF" />
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{labelFr.trim() || t('admin.badge_preview_name')}</Text>
          <Text style={styles.cardMeta} numberOfLines={2}>{`${t(`admin.badge_rule_${rule}`)} : ${n || 0} ${t(`admin.badge_unit_${rule}`)}`}</Text>
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <ProfileField label={t('admin.badge_name_fr')} value={labelFr} onChangeText={setLabelFr} />
        <ProfileField label={t('admin.badge_name_en')} value={labelEn} onChangeText={setLabelEn} />
        <ProfileField label={t('admin.badge_name_ar')} value={labelAr} onChangeText={setLabelAr} />

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>{t('admin.badge_icon')}</Text>
          <View style={styles.iconGrid}>
            {BADGE_ICONS.map((i) => (
              <Pressable key={i} onPress={() => setIcon(i)} accessibilityRole="radio" accessibilityState={{ checked: icon === i }} style={[styles.iconChoice, icon === i && styles.iconChoiceOn]}>
                <MaterialIcons name={i as IconName} size={24} color={icon === i ? colors.primaryInk : colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>{t('admin.badge_rule')}</Text>
          <View style={styles.ruleRow}>
            {BADGE_RULES.map((r) => (
              <Pressable key={r} onPress={() => setRule(r)} accessibilityRole="radio" accessibilityState={{ checked: rule === r }} style={[styles.ruleChip, rule === r && styles.ruleChipOn]}>
                <Text style={[styles.ruleText, rule === r && { color: '#FFFFFF' }]}>{t(`admin.badge_rule_${r}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ProfileField
          label={`${t('admin.badge_threshold')} (${t(`admin.badge_unit_${rule}`)})`}
          value={threshold}
          onChangeText={(v) => setThreshold(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
        />

        <View style={styles.activeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>{t('admin.badge_active')}</Text>
            <Text style={styles.cardMeta}>{t('admin.badge_active_sub')}</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.deep, false: colors.surface2 }} thumbColor="#FFFFFF" />
        </View>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button label={t('member.enregistrer')} onPress={submit} loading={save.isPending} disabled={!valid} />
        {item ? <Button label={t('admin.badge_delete')} onPress={() => onDelete(item)} variant="outline" /> : null}
      </View>
    </BottomSheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { padding: spacing.lg, paddingTop: 0, gap: 12, paddingBottom: 120 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: radii.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
    addText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    cardMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
    tile: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontFamily: fonts.headBold, fontSize: 15.5, letterSpacing: -0.2, color: colors.text },
    cardMeta: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17, color: colors.muted },
    arrows: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    arrow: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
    sheetTitle: { fontFamily: fonts.headBold, fontSize: 20, letterSpacing: -0.3, color: colors.text, marginBottom: 12 },
    preview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface2, marginBottom: 16 },
    fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.muted, marginStart: 4 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iconChoice: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    iconChoiceOn: { borderColor: colors.deep, backgroundColor: colors.primarySoft },
    ruleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ruleChip: { height: 42, paddingHorizontal: 16, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    ruleChipOn: { backgroundColor: colors.deep },
    ruleText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.text },
    activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    activeTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    confirmIcon: { width: 64, height: 64, borderRadius: 32, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft, marginBottom: 14 },
    confirmTitle: { fontFamily: fonts.headBold, fontSize: 19, letterSpacing: -0.3, color: colors.text, textAlign: 'center' },
    confirmText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  });
}
