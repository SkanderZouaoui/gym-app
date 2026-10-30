import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { Button } from '../Button';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '../../i18n';
import { WEEKDAYS_NARROW_MON } from '../../i18n/labels';

/**
 * Sélecteurs de date et d'heure 100 % JavaScript : fonctionnent partout (Expo Go compris),
 * sans module natif de sélection.
 */

const WEEK = WEEKDAYS_NARROW_MON;
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function CalendarSheet({
  visible, value, minimumDate, title, onClose, onSelect,
}: { visible: boolean; value: Date; minimumDate?: Date; title: string; onClose: () => void; onSelect: (d: Date) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  useEffect(() => {
    if (visible) setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible, value]);

  const first = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const min = minimumDate ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()) : null;
  const today = new Date();

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollEnabled={false}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.monthRow}>
        <Pressable style={styles.nav} hitSlop={8} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <MaterialIcons name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.month}>{month.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })}</Text>
        <Pressable style={styles.nav} hitSlop={8} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <MaterialIcons name="chevron-right" size={26} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEK.map((d, i) => (
          <Text key={i} style={styles.weekDay}>{d}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={styles.cell} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const selected = sameDay(date, value);
          const disabled = !!min && date < min;
          return (
            <Pressable key={i} style={styles.cell} disabled={disabled} onPress={() => { onSelect(date); onClose(); }}>
              <View style={[styles.dayCircle, selected && { backgroundColor: colors.primary }, !selected && sameDay(date, today) && { borderWidth: 1.5, borderColor: colors.primary }]}>
                <Text style={[styles.dayText, selected && { color: colors.primaryContrast }, disabled && { color: colors.muted, opacity: 0.4 }]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

export function TimeSheet({
  visible, value, title, onClose, onSelect,
}: { visible: boolean; value: { h: number; m: number }; title: string; onClose: () => void; onSelect: (v: { h: number; m: number }) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [h, setH] = useState(value.h);
  const [m, setM] = useState(value.m);

  useEffect(() => {
    if (visible) {
      setH(value.h);
      setM(value.m);
    }
  }, [visible, value.h, value.m]);

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <BottomSheet visible={visible} onClose={onClose} scrollEnabled={false}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.big}>{pad(h)}:{pad(m)}</Text>
      <Text style={styles.sub}>{t('common.heures')}</Text>
      <View style={styles.chipGrid}>
        {Array.from({ length: 24 }, (_, i) => i).map((i) => (
          <Pressable key={i} style={[styles.chip, h === i && styles.chipOn]} onPress={() => setH(i)}>
            <Text style={[styles.chipText, h === i && { color: colors.primaryContrast }]}>{pad(i)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.sub}>{t('common.minutes')}</Text>
      <View style={styles.chipGrid}>
        {Array.from({ length: 12 }, (_, i) => i * 5).map((i) => (
          <Pressable key={i} style={[styles.chip, m === i && styles.chipOn]} onPress={() => setM(i)}>
            <Text style={[styles.chipText, m === i && { color: colors.primaryContrast }]}>{pad(i)}</Text>
          </Pressable>
        ))}
      </View>
      <Button label={t('common.valider')} onPress={() => { onSelect({ h, m }); onClose(); }} />
    </BottomSheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    title: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    nav: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
    month: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
    weekRow: { flexDirection: 'row' },
    weekDay: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayCircle: { width: '82%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    dayText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    big: { fontFamily: fonts.head, fontSize: 42, letterSpacing: -1.5, color: colors.primary, textAlign: 'center' },
    sub: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { width: '13.5%', height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  });
}
