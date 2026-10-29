import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Chargement différé : si le module natif est absent (Expo Go sans la bonne version), seul cet écran est touché.
function loadPicker(): typeof import('@react-native-community/datetimepicker') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-community/datetimepicker');
  } catch {
    return null;
  }
}
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { Button } from '../Button';

interface Props {
  value: Date;
  onChange: (value: Date) => void;
  /** Interdit les dates passées. */
  minimumDate?: Date;
  /** N'affiche que le champ heure. */
  timeOnly?: boolean;
}

/** Sélecteurs natifs de date et d'heure (deux champs côte à côte). */
export function DateTimeFields({ value, onChange, minimumDate, timeOnly }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [iosMode, setIosMode] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(value);

  const merge = (mode: 'date' | 'time', picked: Date) => {
    const next = new Date(value);
    if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    return next;
  };

  const open = (mode: 'date' | 'time') => {
    const picker = loadPicker();
    if (!picker) return;
    if (Platform.OS === 'android') {
      picker.DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        minimumDate: mode === 'date' ? minimumDate : undefined,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onChange(merge(mode, d));
        },
      });
    } else {
      setDraft(value);
      setIosMode(mode);
    }
  };

  const dateLabel = value.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
  const timeLabel = value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <View style={styles.row}>
        {!timeOnly ? (
        <Pressable style={[styles.field, { flex: 1.5 }]} onPress={() => open('date')}>
          <View style={styles.iconBox}>
            <MaterialIcons name="event" size={20} color={colors.primaryInk} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value} numberOfLines={1}>{dateLabel}</Text>
          </View>
        </Pressable>
        ) : null}
        <Pressable style={[styles.field, { flex: 1 }]} onPress={() => open('time')}>
          <View style={styles.iconBox}>
            <MaterialIcons name="schedule" size={20} color={colors.primaryInk} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.label}>Heure</Text>
            <Text style={styles.value}>{timeLabel}</Text>
          </View>
        </Pressable>
      </View>

      {Platform.OS === 'ios' ? (
        <BottomSheet visible={iosMode !== null} onClose={() => setIosMode(null)} scrollEnabled={false}>
          <Text style={styles.sheetTitle}>{iosMode === 'date' ? 'Choisir la date' : 'Choisir l’heure'}</Text>
          {iosMode ? (
            <IosPicker
              value={draft}
              mode={iosMode}
              display="spinner"
              locale="fr-FR"
              is24Hour
              minimumDate={iosMode === 'date' ? minimumDate : undefined}
              minuteInterval={5}
              onChange={(_e: unknown, d?: Date) => d && setDraft(d)}
            />
          ) : null}
          <Button
            label="Valider"
            onPress={() => {
              if (iosMode) onChange(merge(iosMode, draft));
              setIosMode(null);
            }}
          />
        </BottomSheet>
      ) : null}
    </>
  );
}

function IosPicker(props: Record<string, unknown>) {
  const picker = loadPicker();
  if (!picker) return null;
  const Picker = picker.default as unknown as React.ComponentType<Record<string, unknown>>;
  return <Picker {...props} />;
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
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
  });
}

/** Bouton compact « HH:mm » qui ouvre le sélecteur d'heure natif (horaires d'ouverture). */
export function TimeButton({ value, onChange, disabled }: { value: string; onChange: (hhmm: string) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const toDate = () => {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const open = () => {
    const picker = loadPicker();
    if (!picker || disabled) return;
    if (Platform.OS === 'android') {
      picker.DateTimePickerAndroid.open({
        value: toDate(),
        mode: 'time',
        is24Hour: true,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onChange(fmt(d));
        },
      });
    } else {
      setDraft(toDate());
      setIosOpen(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={open}
        disabled={disabled}
        style={{
          height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2,
          borderWidth: 1, borderColor: colors.border, opacity: disabled ? 0.4 : 1,
        }}
      >
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text }}>{value}</Text>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <BottomSheet visible={iosOpen} onClose={() => setIosOpen(false)} scrollEnabled={false}>
          <Text style={{ fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text }}>Choisir l’heure</Text>
          <IosPicker value={draft} mode="time" display="spinner" locale="fr-FR" is24Hour minuteInterval={5} onChange={(_e: unknown, d?: Date) => d && setDraft(d)} />
          <Button
            label="Valider"
            onPress={() => {
              onChange(fmt(draft));
              setIosOpen(false);
            }}
          />
        </BottomSheet>
      ) : null}
    </>
  );
}
