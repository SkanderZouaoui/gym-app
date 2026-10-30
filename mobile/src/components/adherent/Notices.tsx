import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useDismissedNotices } from '../../store/preferences';
import { useDisplayConfig, useHomeAlerts } from '../../hooks/useHomeAlerts';
import { useMyAnnouncements } from '../../hooks/useAnnouncements';

export type NoticeFormat = 'Bandeau' | 'Pop-up' | 'Encart';
export type NoticeLevel = 'info' | 'warn' | 'urgent';

export interface Notice {
  id: string;
  title: string;
  message: string;
  level: NoticeLevel;
  /** Pictogramme propre au type d'élément (annonce, alerte…). */
  icon?: keyof typeof MaterialIcons.glyphMap;
}

function useTone() {
  const { colors } = useTheme();
  return (level: NoticeLevel) =>
    level === 'urgent'
      ? { icon: 'error' as const, bg: colors.dangerSoft, ink: colors.dangerInk, solid: colors.danger, grad: ['#F87171', '#DC2626'] as [string, string] }
      : level === 'warn'
        ? { icon: 'warning' as const, bg: colors.warningSoft, ink: colors.warningInk, solid: colors.warning, grad: ['#FBBF24', '#D97706'] as [string, string] }
        : { icon: 'info' as const, bg: colors.primarySoft, ink: colors.primaryInk, solid: colors.primary, grad: [colors.primary, colors.primaryPressed] as [string, string] };
}

/** Liste de messages affichés dans la page : « Bandeau » (compact) ou « Encart » (grande carte). Le pop-up est géré par NoticePopups. */
export function NoticeList({ items, format, onDismiss }: { items: Notice[]; format: NoticeFormat; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tone = useTone();
  if (format === 'Pop-up' || items.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((n) => {
        const tn = tone(n.level);
        const icon = n.icon ?? tn.icon;
        if (format === 'Encart') {
          return (
            <Animated.View key={n.id} entering={FadeInDown.duration(260)} exiting={FadeOut.duration(160)} style={[styles.encart, cardShadow]}>
              <View style={[styles.encartAccent, { backgroundColor: tn.solid }]} />
              <View style={[styles.encartIcon, { backgroundColor: tn.bg }]}>
                <MaterialIcons name={icon} size={20} color={tn.ink} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.encartTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.encartText} numberOfLines={2}>{n.message}</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => onDismiss(n.id)} accessibilityLabel={t('common.close')}>
                <MaterialIcons name="close" size={18} color={colors.muted} />
              </Pressable>
            </Animated.View>
          );
        }
        return (
          <Animated.View key={n.id} entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={[styles.banner, { backgroundColor: tn.bg }]}>
            <MaterialIcons name={icon} size={22} color={tn.ink} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.bannerTitle, { color: tn.ink }]}>{n.title}</Text>
              <Text style={[styles.bannerText, { color: tn.ink }]}>{n.message}</Text>
            </View>
            <Pressable hitSlop={8} onPress={() => onDismiss(n.id)} accessibilityLabel={t('common.close')}>
              <MaterialIcons name="close" size={20} color={tn.ink} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Éléments déjà montrés en pop-up pendant cette session de l'app (ils reviennent au prochain lancement tant qu'ils sont actifs). */
const shownPopups = new Set<string>();

/** Pop-up : un message à la fois, par ordre d'importance (urgent d'abord). */
export function NoticePopups({ items, onDismiss }: { items: Notice[]; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tone = useTone();
  const [, force] = useState(0);
  const order = { urgent: 0, warn: 1, info: 2 } as const;
  const queue = [...items].filter((n) => !shownPopups.has(n.id)).sort((a, b) => order[a.level] - order[b.level]);
  const current = queue[0];

  useEffect(() => {
    force((x) => x + 1);
  }, [items.length]);

  if (!current) return null;
  const tn = tone(current.level);
  const close = () => {
    shownPopups.add(current.id);
    onDismiss(current.id);
    force((x) => x + 1);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <Animated.View entering={FadeInDown.duration(240)} style={styles.popup}>
          <LinearGradient colors={tn.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.popupIcon}>
            <MaterialIcons name={current.icon ?? tn.icon} size={34} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.popupEyebrow, { color: tn.ink }]}>
            {current.level === 'urgent' ? t('common.notice_urgent') : current.level === 'warn' ? t('common.notice_warning') : t('common.notice_info')}
          </Text>
          <Text style={styles.popupTitle}>{current.title}</Text>
          <Text style={styles.popupText}>{current.message}</Text>
          <Pressable onPress={close} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={tn.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.popupBtn}>
              <Text style={styles.popupBtnText}>{queue.length > 1 ? t('common.notice_next', { count: queue.length - 1 }) : t('common.notice_understood')}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radii.lg },
    bannerTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
    bannerText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
    encart: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingRight: 14, paddingLeft: 18, overflow: 'hidden',
      borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    encartAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    encartIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    encartTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
    encartText: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 1 },
    scrim: { flex: 1, backgroundColor: 'rgba(7,6,13,0.72)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    popup: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 8, padding: 24, backgroundColor: colors.surface, borderRadius: 30, borderWidth: 1, borderColor: colors.border },
    popupIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    popupEyebrow: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 1.2, textTransform: 'uppercase' },
    popupTitle: { fontFamily: fonts.head, fontSize: 22, letterSpacing: -0.7, color: colors.text, textAlign: 'center' },
    popupText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginBottom: 10 },
    popupBtn: { alignSelf: 'stretch', minWidth: 240, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    popupBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
  });
}

/**
 * Alertes et annonces de l'admin pour l'accueil de l'équipe (accueil, coach) : mêmes trois formats
 * (bandeau, encart, pop-up) que côté adhérent, choisis dans la configuration.
 */
const NEWS_TONES = {
  info: { ink: '#DDD6FE', pill: { backgroundColor: 'rgba(167,139,250,0.22)', borderColor: 'rgba(167,139,250,0.4)' } },
  accent: { ink: '#A7F3D0', pill: { backgroundColor: 'rgba(52,211,153,0.2)', borderColor: 'rgba(52,211,153,0.4)' } },
  danger: { ink: '#FECACA', pill: { backgroundColor: 'rgba(248,113,113,0.22)', borderColor: 'rgba(248,113,113,0.42)' } },
} as const;

/**
 * Section « Annonces » de l'accueil : cartes sombres avec pastille de ton, comme sur l'accueil adhérent.
 * Affichée à la place du bandeau quand le format choisi par l'admin n'est pas « Bandeau ».
 */
export function RoleAnnouncements() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: display } = useDisplayConfig();
  const { data: announcements } = useMyAnnouncements();
  if ((display?.announcementFormat ?? 'Bandeau') === 'Bandeau' || !(announcements ?? []).length) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text }}>{t('home.announcementsTitle')}</Text>
      {(announcements ?? []).slice(0, 3).map((a) => {
        const tone = NEWS_TONES[a.tone ?? 'info'];
        return (
          <View key={a.id} style={{ height: 176, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#0B0B0F' }}>
            <LinearGradient colors={[colors.secondary, '#0B0B0F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
            <View style={[{ position: 'absolute', top: 14, left: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 }, tone.pill]}>
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11.5, letterSpacing: 0.2, color: tone.ink }}>
                {a.tone === 'danger' ? t('home.announcementImportant') : a.tone === 'accent' ? t('home.announcementNew') : t('home.announcementInfo')}
              </Text>
            </View>
            <View style={{ padding: 18 }}>
              <Text style={{ fontFamily: fonts.head, fontSize: 20, letterSpacing: -0.4, color: '#FFFFFF' }} numberOfLines={2}>{a.title}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 3 }} numberOfLines={2}>{a.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function RoleNotices() {
  const { data: display } = useDisplayConfig();
  const { data: homeAlerts } = useHomeAlerts();
  const { data: announcements } = useMyAnnouncements();
  const { isDismissed, dismiss } = useDismissedNotices();
  const alertFormat = display?.alertFormat ?? 'Bandeau';
  const announcementFormat = display?.announcementFormat ?? 'Bandeau';

  const toLevel = (l: string): NoticeLevel => (l === 'urgent' || l === 'warn' ? l : 'info');
  const allAlerts: Notice[] = (homeAlerts ?? []).map((a) => ({ id: `alert:${a.id}`, title: a.title, message: a.message, level: toLevel(a.level) }));
  const allAnnouncements: Notice[] = (announcements ?? []).slice(0, 3).map((a) => ({
    id: `news:${a.id}`,
    title: a.title,
    message: a.body,
    level: (a.tone === 'danger' ? 'urgent' : a.tone === 'accent' ? 'warn' : 'info') as NoticeLevel,
    icon: 'campaign' as const,
  }));
  const alertsShown = allAlerts.filter((n) => !isDismissed(n.id));
  const announcementsShown = allAnnouncements.filter((n) => !isDismissed(n.id));

  return (
    <>
      <NoticeList items={alertsShown} format={alertFormat === 'Pop-up' ? 'Bandeau' : alertFormat} onDismiss={dismiss} />
      {announcementFormat === 'Bandeau' ? <NoticeList items={announcementsShown} format="Bandeau" onDismiss={dismiss} /> : null}
      <NoticePopups
        items={[...(alertFormat === 'Pop-up' ? allAlerts : []), ...(announcementFormat === 'Pop-up' ? allAnnouncements : [])].filter((n) => !isDismissed(n.id))}
        onDismiss={dismiss}
      />
    </>
  );
}
