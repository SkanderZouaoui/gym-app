import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { CalendarSheet, TimeSheet } from './pickers';

interface Props {
  value: Date;
  onChange: (value: Date) => void;
  /** Interdit les dates passées. */
  minimumDate?: Date;
  /** N'affiche que le champ heure. */
  timeOnly?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Champs date et heure (côte à côte) ; sélecteurs JavaScript, sans module natif. */
export function DateTimeFields({ value, onChange, minimumDate, timeOnly }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const dateLabel = value.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
  const timeLabel = `${pad(value.getHours())}:${pad(value.getMinutes())}`;

  return (
    <>
      <View style={styles.row}>
        {!timeOnly ? (
          <Pressable style={[styles.field, { flex: 1.5 }]} onPress={() => setDateOpen(true)}>
            <View style={styles.iconBox}>
              <MaterialIcons name="event" size={20} color={colors.primaryInk} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value} numberOfLines={1}>{dateLabel}</Text>
            </View>
          </Pressable>
        ) : null}
        <Pressable style={[styles.field, { flex: 1 }]} onPress={() => setTimeOpen(true)}>
          <View style={styles.iconBox}>
            <MaterialIcons name="schedule" size={20} color={colors.primaryInk} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.label}>Heure</Text>
            <Text style={styles.value}>{timeLabel}</Text>
          </View>
        </Pressable>
      </View>

      <CalendarSheet
        visible={dateOpen}
        value={value}
        minimumDate={minimumDate}
        title="Choisir la date"
        onClose={() => setDateOpen(false)}
        onSelect={(d) => {
          const next = new Date(value);
          next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          onChange(next);
        }}
      />
      <TimeSheet
        visible={timeOpen}
        value={{ h: value.getHours(), m: value.getMinutes() }}
        title="Choisir l’heure"
        onClose={() => setTimeOpen(false)}
        onSelect={({ h, m }) => {
          const next = new Date(value);
          next.setHours(h, m, 0, 0);
          onChange(next);
        }}
      />
    </>
  );
}

/** Bouton compact « HH:mm » qui ouvre le sélecteur d'heure (horaires d'ouverture, planning). */
export function TimeButton({ value, onChange, disabled }: { value: string; onChange: (hhmm: string) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [h, m] = value.split(':').map(Number);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={{
          height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2,
          borderWidth: 1, borderColor: colors.border, opacity: disabled ? 0.4 : 1,
        }}
      >
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text }}>{value}</Text>
      </Pressable>
      <TimeSheet
        visible={open}
        value={{ h: h || 0, m: m || 0 }}
        title="Choisir l’heure"
        onClose={() => setOpen(false)}
        onSelect={(v) => onChange(`${pad(v.h)}:${pad(v.m)}`)}
      />
    </>
  );
}

const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, mo, d] = s.split('-').map(Number);
  return y ? new Date(y, (mo || 1) - 1, d || 1) : new Date();
};

/** Champ date (AAAA-MM-JJ) avec calendrier ; `value` vide = non défini (si `clearable`). */
export function DateField({
  label, value, onChange, clearable, minimumDate, icon = 'event',
}: { label: string; value: string; onChange: (iso: string) => void; clearable?: boolean; minimumDate?: Date; icon?: keyof typeof MaterialIcons.glyphMap }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 12, borderRadius: radii.lg,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
          <MaterialIcons name={icon} size={20} color={colors.primaryInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted }}>{label}</Text>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: value ? colors.text : colors.muted }} numberOfLines={1}>
            {value ? fromIso(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Aucune limite'}
          </Text>
        </View>
        {clearable && value ? (
          <Pressable onPress={() => onChange('')} hitSlop={10}>
            <MaterialIcons name="close" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </Pressable>
      <CalendarSheet visible={open} value={value ? fromIso(value) : new Date()} minimumDate={minimumDate} title={label} onClose={() => setOpen(false)} onSelect={(d) => onChange(toIso(d))} />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    field: {
      flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingHorizontal: 12, borderRadius: radii.lg,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    value: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, marginTop: 1 },
  });
}
