import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { BottomSheet } from '../../../src/components/ui';
import { Button } from '../../../src/components/Button';
import { muscleGroupLabel } from '../../../src/constants/muscleGroups';
import { muscleIcon, useAdminExercise, useDeactivateExercise } from '../../../src/hooks/useAdmin';
import { useTranslation } from 'react-i18next';
import i18n from '../../../src/i18n';
import { levelLabel } from '../../../src/i18n/labels';

const TYPE_LABEL = { get STRENGTH() { return i18n.t('admin.force'); }, get CARDIO() { return i18n.t('common.cardio'); }, get MOBILITY() { return i18n.t('admin.mobilite'); } } as const;

/** Détail d'un exercice de la bibliothèque (admin) : niveau, utilisation, muscles, exécution. */
export default function AdminExerciseDetailScreen() {
  useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, cardShadow } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: ex, isLoading } = useAdminExercise(id);
  const deactivate = useDeactivateExercise();
  const [confirm, setConfirm] = useState(false);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(admin)/exercises'));

  if (isLoading || !ex) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const steps = (ex.instructions ?? '')
    .split(/\n+|(?<=\.)\s+(?=[A-ZÉÈÀ])/)
    .map((t) => t.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primaryInk} />
          <Text style={styles.backText}>{i18n.t('common.retour')}</Text>
        </Pressable>

        <View style={styles.heroShadow}>
          <LinearGradient colors={[colors.primary, colors.primaryPressed]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecor} />
            <View style={styles.heroIcon}>
              <MaterialIcons name={muscleIcon(ex.muscleGroup ?? '')} size={30} color="#FFFFFF" />
            </View>
            <View style={styles.tagRow}>
              {ex.level ? <View style={styles.tag}><Text style={styles.tagText}>{levelLabel(ex.level)}</Text></View> : null}
              {ex.equipment ? <View style={styles.tag}><Text style={styles.tagText}>{ex.equipment}</Text></View> : null}
              {!ex.isActive ? <View style={styles.tag}><Text style={styles.tagText}>{i18n.t('admin.desactive')}</Text></View> : null}
            </View>
            <Text style={styles.heroTitle}>{ex.name}</Text>
            <Text style={styles.heroSub}>{i18n.t('admin.bibliotheque_dexercices', { v0: ex.muscleGroup ? muscleGroupLabel(ex.muscleGroup) : i18n.t('admin.sans_groupe') })}</Text>
          </LinearGradient>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.stat, cardShadow]}>
            <Text style={styles.statLabel}>{i18n.t('common.niveau')}</Text>
            <Text style={styles.statValue}>{ex.level ? levelLabel(ex.level) : '—'}</Text>
          </View>
          <View style={[styles.stat, cardShadow]}>
            <Text style={styles.statLabel}>{i18n.t('admin.utilise_dans')}</Text>
            <Text style={styles.statValue}>{i18n.t('admin.programme', { v0: ex.usedInPrograms ?? 0, v2: (ex.usedInPrograms ?? 0) > 1 ? 's' : '' })}</Text>
          </View>
        </View>

        <Text style={styles.section}>{i18n.t('common.muscles_sollicites')}</Text>
        <View style={styles.chips}>
          {[ex.muscleGroup ? muscleGroupLabel(ex.muscleGroup) : null, TYPE_LABEL[ex.type]].filter(Boolean).map((m) => (
            <View key={m} style={styles.chip}><Text style={styles.chipText}>{m}</Text></View>
          ))}
        </View>

        <Text style={styles.section}>{i18n.t('common.execution')}</Text>
        <View style={[styles.card, cardShadow]}>
          {steps.length === 0 ? <Text style={styles.empty}>{i18n.t('admin.aucune_consigne_renseignee')}</Text> : null}
          {steps.map((t, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 10, marginTop: 6 }}>
          <Button label={i18n.t('admin.modifier_lexercice')} onPress={() => router.push({ pathname: '/(admin)/exercises/form', params: { id: ex.id } })} />
          {ex.isActive ? <Button label={i18n.t('admin.desactiver_lexercice')} variant="outline" onPress={() => setConfirm(true)} /> : null}
        </View>
      </ScrollView>

      <BottomSheet visible={confirm} onClose={() => setConfirm(false)}>
        <Text style={styles.sheetTitle}>{i18n.t('admin.desactiver', { name: ex.name })}</Text>
        <Text style={styles.sheetText}>{i18n.t('admin.il_ne_sera_plus_propose')}</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={i18n.t('admin.oui_desactiver')} variant="danger" loading={deactivate.isPending} onPress={() => deactivate.mutate(ex.id, { onSuccess: () => { setConfirm(false); goBack(); } })} />
          <Button label={i18n.t('common.annuler')} variant="outline" onPress={() => setConfirm(false)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    container: { paddingHorizontal: spacing.lg, gap: 12, paddingBottom: 60 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryInk },
    heroShadow: { borderRadius: 28, shadowColor: colors.primary, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 7 },
    hero: { borderRadius: 28, padding: 22, overflow: 'hidden', gap: 6 },
    heroDecor: { position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.12)' },
    heroIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    tag: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
    tagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
    heroTitle: { fontFamily: fonts.head, fontSize: 30, letterSpacing: -1, color: '#FFFFFF', marginTop: 4 },
    heroSub: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
    statRow: { flexDirection: 'row', gap: 10 },
    stat: { flex: 1, padding: 14, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    statLabel: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
    statValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, marginTop: 2 },
    section: { fontFamily: fonts.head, fontSize: 17, letterSpacing: -0.3, color: colors.text, marginTop: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primarySoft },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    card: { padding: 14, gap: 12, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
    stepNumText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryInk },
    stepText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text, paddingTop: 3 },
    empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
    sheetTitle: { fontFamily: fonts.headSemiBold, fontSize: 18, color: colors.text },
    sheetText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.muted },
  });
}
