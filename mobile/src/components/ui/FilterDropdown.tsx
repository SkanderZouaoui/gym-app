import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { BottomSheet } from './BottomSheet';

export interface FilterOption<T extends string | null> {
  value: T;
  label: string;
  /** Nombre de résultats pour ce choix, affiché à droite dans la liste. */
  count?: number;
}

interface FilterDropdownProps<T extends string | null> {
  /** Nom du filtre, affiché sur le bouton et dans la feuille (ex. « Statut »). */
  title: string;
  /** Icône du filtre, affichée à gauche du bouton. */
  icon?: keyof typeof MaterialIcons.glyphMap;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}

/** Filtre en liste déroulante : un bouton compact « Statut : Actifs » qui ouvre la liste des choix
 * dans une feuille. Le bouton est mis en avant dès qu'un autre choix que le premier est actif. */
export function FilterDropdown<T extends string | null>({ title, icon = 'tune', value, options, onChange }: FilterDropdownProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  const filtered = options.length > 0 && value !== options[0].value;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title} : ${current?.label}`}
        style={({ pressed }) => [styles.button, filtered && styles.buttonActive, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.iconBox, filtered && styles.iconBoxActive]}>
          <MaterialIcons name={icon} size={18} color={filtered ? '#FFFFFF' : colors.primaryInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.value, filtered && styles.valueActive]} numberOfLines={1}>{current?.label}</Text>
        </View>
        <MaterialIcons name="expand-more" size={22} color={filtered ? colors.primaryInk : colors.muted} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <View style={styles.list}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.label}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>{o.label}</Text>
                {o.count !== undefined ? (
                  <View style={[styles.count, active && styles.countActive]}>
                    <Text style={[styles.countText, active && styles.countTextActive]}>{o.count}</Text>
                  </View>
                ) : null}
                {active ? <MaterialIcons name="check" size={22} color={colors.primaryInk} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    button: {
      flexGrow: 1, flexBasis: 150, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    buttonActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
    iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    iconBoxActive: { backgroundColor: colors.primary },
    count: { minWidth: 28, paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    countActive: { backgroundColor: colors.surface },
    countText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    countTextActive: { color: colors.primaryInk },
    title: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.4, color: colors.muted, textTransform: 'uppercase' },
    value: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
    valueActive: { color: colors.primaryInk },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text, marginBottom: 8 },
    list: { gap: 8, marginBottom: 8 },
    option: {
      minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16,
    },
    optionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
    optionText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    optionTextActive: { color: colors.primaryInk, fontFamily: fonts.bodyBold },
  });
}
