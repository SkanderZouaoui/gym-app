import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { BottomSheet } from '../ui';
import type { ClassSessionSummary } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../i18n';

interface Props {
  session: ClassSessionSummary | null;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Étape de confirmation avant de réserver une place (ou de rejoindre la liste d'attente). */
export function BookingConfirmSheet({ session, pending, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const start = session ? new Date(session.startsAt) : null;
  const end = session ? new Date(session.endsAt) : null;
  const full = session ? session._count.bookings >= session.capacity : false;
  const time = (d: Date) => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

  const rows: { icon: keyof typeof MaterialIcons.glyphMap; label: string }[] =
    session && start && end
      ? [
          { icon: 'event', label: start.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) },
          { icon: 'schedule', label: `${time(start)} – ${time(end)}` },
          { icon: 'sports', label: session.coach ? `${session.coach.user.firstName} ${session.coach.user.lastName}` : t('common.sans_coach') },
          { icon: 'meeting-room', label: session.room?.name ?? '—' },
        ]
      : [];

  return (
    <BottomSheet visible={!!session} onClose={onClose}>
      {session ? (
        <View style={{ gap: 14 }}>
          <View style={styles.head}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
              <MaterialIcons name={full ? 'hourglass-top' : 'event-available'} size={26} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{full ? t('member.liste_dattente') : t('member.confirmer_la_reservation')}</Text>
              <Text style={styles.title} numberOfLines={2}>{session.classType.name}</Text>
            </View>
          </View>

          <View style={styles.details}>
            {rows.map((r) => (
              <View key={r.icon} style={styles.row}>
                <MaterialIcons name={r.icon} size={18} color={colors.primaryInk} />
                <Text style={styles.rowText} numberOfLines={1}>{r.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.note}>
            {full
              ? t('member.ce_cours_est_complet_vous')
              : t('member.vous_pourrez_annuler_votre_reservation')}
          </Text>

          <Pressable onPress={onConfirm} disabled={pending} style={({ pressed }) => [pending && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirm}>
              <Text style={styles.confirmText}>{pending ? t('member.reservation') : full ? t('member.rejoindre_la_liste_dattente') : t('member.confirmer_la_reservation_2')}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.annuler')}</Text>
          </Pressable>
        </View>
      ) : null}
    </BottomSheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: colors.primaryInk },
    title: { fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.6, color: colors.text, marginTop: 2 },
    details: { gap: 10, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
    note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
    confirm: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    confirmText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
    cancel: { height: 46, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.muted },
  });
}
