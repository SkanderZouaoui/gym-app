import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

export interface SelectOption {
  value: string | null;
  label: string;
  sub?: string;
}

interface CreateConfig {
  /** Libellé de la ligne d'ajout, ex. « Nouveau type de cours ». */
  label: string;
  placeholder: string;
  /** Champ numérique facultatif (capacité, durée…), avec sa valeur par défaut. */
  extra?: { label: string; unit: string; defaultValue: number };
  /** Crée l'élément et renvoie l'identifiant à sélectionner. */
  submit: (name: string, extra: number) => Promise<string>;
}

interface Props {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string | null;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string | null) => void;
  create?: CreateConfig;
}

/** Champ à liste déroulante (feuille) avec ajout direct d'un nouvel élément. */
export function SelectField({ label, icon, value, options, placeholder, onChange, create }: Props) {
  useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [extra, setExtra] = useState(String(create?.extra?.defaultValue ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = options.find((o) => o.value === value);

  const close = () => {
    setOpen(false);
    setAdding(false);
    setName('');
    setError(null);
  };

  const submit = async () => {
    if (!create || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await create.submit(name.trim(), Number(extra) || create.extra?.defaultValue || 0);
      onChange(id);
      close();
    } catch {
      setError(i18n.t('common.impossible_dajouter_cet_element_reessayez'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.field, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${label} : ${current?.label ?? placeholder}`}>
        <View style={styles.iconBox}>
          <MaterialIcons name={icon} size={20} color={colors.primaryInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !current && { color: colors.muted }]} numberOfLines={1}>{current?.label ?? placeholder}</Text>
        </View>
        <MaterialIcons name="expand-more" size={24} color={colors.muted} />
      </Pressable>

      <BottomSheet visible={open} onClose={close}>
        <Text style={styles.sheetTitle}>{label}</Text>
        <View style={{ gap: 8 }}>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value ?? 'none'}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  onChange(o.value);
                  close();
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.optionText, active && { color: colors.primaryContrast }]} numberOfLines={1}>{o.label}</Text>
                  {o.sub ? <Text style={[styles.optionSub, active && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>{o.sub}</Text> : null}
                </View>
                {active ? <MaterialIcons name="check" size={20} color={colors.primaryContrast} /> : null}
              </Pressable>
            );
          })}

          {create ? (
            adding ? (
              <View style={styles.addBox}>
                <TextInput
                  autoFocus
                  value={name}
                  onChangeText={setName}
                  placeholder={create.placeholder}
                  placeholderTextColor={colors.muted}
                  style={styles.addInput}
                />
                {create.extra ? (
                  <View style={styles.extraRow}>
                    <Text style={styles.extraLabel}>{create.extra.label}</Text>
                    <TextInput
                      value={extra}
                      onChangeText={(t) => setExtra(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      style={styles.extraInput}
                    />
                    <Text style={styles.extraLabel}>{create.extra.unit}</Text>
                  </View>
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={[styles.addBtn, styles.addBtnGhost]} onPress={() => setAdding(false)}>
                    <Text style={[styles.addBtnText, { color: colors.text }]}>{i18n.t('common.annuler')}</Text>
                  </Pressable>
                  <Pressable style={[styles.addBtn, (!name.trim() || busy) && { opacity: 0.5 }]} disabled={!name.trim() || busy} onPress={submit}>
                    <Text style={styles.addBtnText}>{busy ? i18n.t('common.ajout') : i18n.t('common.ajouter_et_choisir')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.newRow} onPress={() => setAdding(true)}>
                <MaterialIcons name="add-circle-outline" size={22} color={colors.primaryInk} />
                <Text style={styles.newText}>{create.label}</Text>
              </Pressable>
            )
          ) : null}
        </View>
      </BottomSheet>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    field: {
      flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, borderRadius: radii.lg,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    iconBox: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
    value: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, marginTop: 1 },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text, marginBottom: 4 },
    option: {
      minHeight: 54, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
    optionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
    newRow: {
      minHeight: 54, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySoft,
    },
    newText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primaryInk },
    addBox: { gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.primarySoft },
    addInput: {
      height: 50, borderRadius: 12, paddingHorizontal: 14, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    extraRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    extraLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primaryInk },
    extraInput: {
      width: 72, height: 44, borderRadius: 12, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    error: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.dangerInk },
    addBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    addBtnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    addBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryContrast },
  });
}
