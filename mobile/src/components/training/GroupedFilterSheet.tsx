import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomSheet } from '../ui';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface GroupedFilterSheetProps {
  visible: boolean;
  title: string;
  groups: FilterGroup[];
  selected: string[];
  onClose: () => void;
  onApply: (selected: string[]) => void;
  /** Affiche un champ de recherche quand la liste totale dépasse ce nombre
   * d'options (évite un champ inutile pour un petit filtre). */
  searchThreshold?: number;
}

/** Feuille de filtre générique : liste d'options groupées par catégorie,
 * sélection multiple via case à cocher. Partagée entre le filtre groupe
 * musculaire et le filtre équipement de la bibliothèque d'exercices — même
 * pattern d'interaction pour les deux plutôt que deux UI différentes. */
export function GroupedFilterSheet({
  visible,
  title,
  groups,
  selected,
  onClose,
  onApply,
  searchThreshold = 15,
}: GroupedFilterSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [draft, setDraft] = useState<string[]>(selected);
  const [search, setSearch] = useState('');

  // Resynchronise le brouillon à chaque ouverture, pour refléter la sélection
  // réellement appliquée plutôt qu'un état laissé par une ouverture passée.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft(selected);
      setSearch('');
    }
  }

  const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);
  const showSearch = totalOptions > searchThreshold;

  const filteredGroups = search.trim()
    ? groups
        .map((g) => ({
          ...g,
          options: g.options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase())),
        }))
        .filter((g) => g.options.length > 0)
    : groups;

  const toggle = (value: string) => {
    setDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => setDraft([]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={handleClear}>
          <Text style={styles.clear}>Effacer</Text>
        </Pressable>
      </View>

      {showSearch ? (
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
      ) : null}

      <View style={styles.list}>
        {filteredGroups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.options.map((option) => {
              const isActive = draft.includes(option.value);
              return (
                <Pressable key={option.value} style={styles.row} onPress={() => toggle(option.value)}>
                  <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                    {isActive ? <MaterialIcons name="check" size={14} color={colors.primaryContrast} /> : null}
                  </View>
                  <Text style={styles.rowLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Pressable style={styles.applyButton} onPress={handleApply}>
        <Text style={styles.applyButtonText}>
          {draft.length > 0 ? `Appliquer (${draft.length})` : 'Appliquer'}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.headSemiBold, fontSize: 17, color: colors.text },
    clear: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
    searchWrap: { position: 'relative', marginTop: spacing.sm },
    searchIcon: { position: 'absolute', left: 12, top: 13, zIndex: 1 },
    searchInput: {
      height: 40, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
      paddingLeft: 38, paddingRight: 14, fontFamily: fonts.body, fontSize: 14, color: colors.text,
    },
    list: { marginTop: spacing.sm, gap: spacing.md },
    group: { gap: 2 },
    groupLabel: {
      fontFamily: fonts.bodySemiBold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase',
      color: colors.muted, marginBottom: 4,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44 },
    checkbox: {
      width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderStrong,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.text },
    applyButton: {
      height: 48, borderRadius: radii.sm, backgroundColor: colors.primary, alignItems: 'center',
      justifyContent: 'center', marginTop: spacing.md,
    },
    applyButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryContrast },
  });
}
