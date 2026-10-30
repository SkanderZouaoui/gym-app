import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import type { SetDraft } from './SetRow';
import { useTranslation } from 'react-i18next';

interface ExerciseEditorCardProps {
  name: string;
  sets: SetDraft[];
  onChangeSet: (index: number, field: 'reps' | 'weightKg', value: string) => void;
  onAddSet: () => void;
  onRemoveSet: (index: number) => void;
  /** Absent : pas de bouton de suppression de l'exercice (ex. écran d'ajout). */
  onRemove?: () => void;
  /** Appui sur l'en-tête (icône + nom) : ouvre la fiche de l'exercice. */
  onPressHeader?: () => void;
}

/** Carte d'exercice du composeur de programme v2 : saisie directe des répétitions et de la charge
 * de chaque série, ajout/suppression de série, suppression de l'exercice. */
export function ExerciseEditorCard({ name, sets, onChangeSet, onAddSet, onRemoveSet, onRemove, onPressHeader }: ExerciseEditorCardProps) {
  const { t } = useTranslation();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <Pressable style={styles.headerPress} onPress={onPressHeader} disabled={!onPressHeader}>
        <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
          <MaterialIcons name="fitness-center" size={24} color="#FFFFFF" />
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.meta}>{t('member.serie_3', { length: sets.length, v2: sets.length > 1 ? 's' : '' })}</Text>
        </View>
        </Pressable>
        {onRemove ? (
          <Pressable style={styles.removeButton} onPress={onRemove} accessibilityLabel={t('member.retirer_lexercice')}>
            <MaterialIcons name="delete-outline" size={20} color={colors.dangerInk} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.gridRow}>
        <Text style={[styles.colHeader, { width: 34 }]}>{t('member.serie_2')}</Text>
        <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>{t('member.repetitions')}</Text>
        <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>{t('member.charge')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ gap: 8 }}>
        {sets.map((s, i) => (
          <View key={i} style={styles.gridRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={s.reps}
                onChangeText={(v) => onChangeSet(i, 'reps', v)}
                keyboardType="number-pad"
                style={styles.input}
                selectTextOnFocus
                accessibilityLabel={t('member.repetitions_2')}
              />
              <Text style={styles.suffix} pointerEvents="none">{t('member.reps_2')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={s.weightKg}
                onChangeText={(v) => onChangeSet(i, 'weightKg', v)}
                keyboardType="decimal-pad"
                style={styles.input}
                selectTextOnFocus
                accessibilityLabel={t('member.charge_en_kilos')}
              />
              <Text style={styles.suffix} pointerEvents="none">{t('member.kg_3')}</Text>
            </View>
            <Pressable
              style={styles.deleteSet}
              onPress={() => onRemoveSet(i)}
              disabled={sets.length <= 1}
              accessibilityLabel={t('member.supprimer_la_serie')}
            >
              <MaterialIcons name="remove-circle-outline" size={24} color={sets.length <= 1 ? colors.border : colors.dangerInk} />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable style={({ pressed }) => [styles.addSet, pressed && { transform: [{ scale: 0.98 }] }]} onPress={onAddSet}>
        <MaterialIcons name="add" size={20} color={colors.primaryInk} />
        <Text style={styles.addSetText}>{t('common.ajouter_une_serie')}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    headerPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
    icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
    meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    removeButton: {
      width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    gridRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    colHeader: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.muted },
    badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
    badgeText: { fontFamily: fonts.head, fontSize: 14, color: colors.primaryInk },
    input: {
      height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
      textAlign: 'center', paddingHorizontal: 30, fontFamily: fonts.head, fontSize: 17, color: colors.text,
    },
    suffix: { position: 'absolute', right: 12, top: 0, bottom: 0, textAlignVertical: 'center', lineHeight: 48, fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
    deleteSet: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    addSet: {
      minHeight: 44, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
      backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4,
    },
    addSetText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
  });
}
