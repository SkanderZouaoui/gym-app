import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useStaffRoutes } from '../../navigation/staffRoutes';
import { useLoginIssues } from '../../hooks/useStaff';

/** Accès à la section « Comptes bloqués » (accueil et admin), volontairement sobre : surface neutre, la couleur
 * n'apparaît que dans un petit point d'alerte.
 * - `entry` : en haut de l'onglet Adhérents, dès qu'un compte pose problème (bloqué, échecs, désactivé) ;
 * - `alert` : sur l'accueil, seulement quand au moins un adhérent est bloqué en ce moment. */
export function LockedAccountsCard({ variant }: { variant: 'entry' | 'alert' }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const routes = useStaffRoutes();
  const { data } = useLoginIssues();

  const issues = data ?? [];
  const locked = issues.filter((i) => i.reason === 'LOCKED').length;
  const failed = issues.filter((i) => i.reason === 'FAILED_ATTEMPTS').length;
  const disabled = issues.filter((i) => i.reason === 'SUSPENDED').length;

  if (variant === 'alert' && locked === 0) return null;
  if (variant === 'entry' && issues.length === 0) return null;

  const open = () => router.push(routes.lockedAccounts);

  if (variant === 'alert') {
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, cardShadow, { borderColor: `${colors.danger}40` }, pressed && styles.pressed]}
      >
        <View style={styles.tile}>
          <MaterialIcons name="lock-person" size={22} color={colors.text} />
          <View style={[styles.badgeDot, { backgroundColor: colors.danger, borderColor: colors.surface }]} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>
            {locked === 1 ? t('staff.locked_alert_title_one') : t('staff.locked_alert_title_many', { count: locked })}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>{t('staff.locked_alert_text')}</Text>
        </View>
        <Text style={styles.link}>{t('staff.locked_alert_action')}</Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
      </Pressable>
    );
  }

  const parts = [
    locked > 0 ? t('staff.locked_count_locked', { count: locked }) : null,
    failed > 0 ? t('staff.locked_count_failed', { count: failed }) : null,
    disabled > 0 ? t('staff.locked_count_disabled', { count: disabled }) : null,
  ].filter(Boolean);

  return (
    <Pressable onPress={open} accessibilityRole="button" style={({ pressed }) => [styles.card, cardShadow, pressed && styles.pressed]}>
      <View style={styles.tile}>
        <MaterialIcons name="lock-person" size={22} color={colors.text} />
        {locked > 0 ? <View style={[styles.badgeDot, { backgroundColor: colors.danger, borderColor: colors.surface }]} /> : null}
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{t('staff.locked_title')}</Text>
        <Text style={styles.sub} numberOfLines={1}>{parts.join(' · ')}</Text>
      </View>
      <View style={styles.count}>
        <Text style={styles.countText}>{issues.length}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: radii.xl, paddingVertical: 12, paddingHorizontal: 14,
    },
    pressed: { transform: [{ scale: 0.985 }] },
    tile: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    badgeDot: { position: 'absolute', top: -2, right: -2, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
    texts: { flex: 1, minWidth: 0, gap: 1 },
    title: { fontFamily: fonts.headSemiBold, fontSize: 15, color: colors.text },
    sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
    link: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
    count: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    countText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  });
}
