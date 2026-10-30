import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../i18n';
import { BottomSheet } from './ui';

/** Choix de la langue de l'application (français, anglais, arabe) : le changement est immédiat. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { language, setLanguage } = useLanguage();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{t('common.langue')}</Text>
      <View style={styles.list}>
        {SUPPORTED_LANGUAGES.map((code) => {
          const active = language === code;
          return (
            <Pressable
              key={code}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => {
                setLanguage(code);
                onClose();
              }}
            >
              <Text style={[styles.text, active && styles.textActive]}>{LANGUAGE_LABELS[code]}</Text>
              {active ? <MaterialIcons name="check" size={22} color={colors.primaryInk} /> : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    title: { fontFamily: fonts.headSemiBold, fontSize: 19, color: colors.text },
    list: { gap: 8, marginTop: 6, marginBottom: 6 },
    row: {
      minHeight: 54, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    rowActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    text: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
    textActive: { color: colors.primaryInk, fontFamily: fonts.bodyBold },
  });
}
