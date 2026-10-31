import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';

interface Props {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value?: string | null;
  /** Lien ouvert par un appui sur la ligne (`tel:`, `mailto:`). */
  href?: string;
  /** Affiche le bouton « copier » (désactivé pour une simple information comme la date d'inscription). */
  copyable?: boolean;
  /** Dernière ligne de la carte : pas de séparateur. */
  last?: boolean;
}

/** Ligne de coordonnée : tuile d'icône, libellé en petites capitales, valeur ; appui = ouvrir (appel / e-mail) ; bouton copier avec retour visuel. */
export function MemberContactRow({ icon, label, value, href, copyable = false, last = false }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasValue = !!value && value.trim() !== '' && value !== '—';

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (!hasValue) return;
    await Clipboard.setStringAsync(value!);
    void haptics.selection();
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  const open = () => {
    if (hasValue && href) void Linking.openURL(href);
  };

  const body = (
    <>
      {hasValue ? (
        <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
          <MaterialIcons name={icon} size={22} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={[styles.tile, { backgroundColor: colors.surface2 }]}>
          <MaterialIcons name={icon} size={22} color={colors.muted} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>{label.toUpperCase()}</Text>
        {hasValue ? (
          <Text style={styles.value} numberOfLines={1}>{value}</Text>
        ) : (
          <Text style={styles.empty}>{t('staff.non_renseigne')}</Text>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.row, !last && styles.separator]}>
      {href && hasValue ? (
        <Pressable onPress={open} style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]} accessibilityRole="link" accessibilityLabel={`${label} ${value}`}>
          {body}
        </Pressable>
      ) : (
        <View style={styles.main}>{body}</View>
      )}

      {copyable && hasValue ? (
        <Pressable
          onPress={copy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={copied ? t('common.copie') : t('staff.copier')}
          style={({ pressed }) => [styles.copyBtn, copied && { backgroundColor: colors.successSoft }, pressed && { transform: [{ scale: 0.92 }] }]}
        >
          <MaterialIcons name={copied ? 'check' : 'content-copy'} size={18} color={copied ? colors.successInk : colors.primaryInk} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    separator: { borderBottomWidth: 1, borderBottomColor: colors.border },
    main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
    tile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    text: { flex: 1, minWidth: 0, gap: 2 },
    label: { fontFamily: fonts.bodyBold, fontSize: 11.5, letterSpacing: 0.7, color: colors.muted },
    value: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    empty: { fontFamily: fonts.body, fontSize: 15, fontStyle: 'italic', color: colors.muted },
    copyBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  });
}
