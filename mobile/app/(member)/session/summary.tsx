import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionSheetIOS, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fonts, radii, spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCreateWorkoutLog, useExercises, useMyWorkouts } from '../../../src/hooks/useCoaching';
import { useCreatePost, useUploadPostPhoto } from '../../../src/hooks/useSocial';
import { Button } from '../../../src/components/Button';
import { Banner } from '../../../src/components/ui';

interface FinishedSet {
  exerciseId: string;
  setNumber: number;
  weightKg?: number;
  reps?: number;
}

const FEELINGS = [
  { value: 'EASY', label: 'Facile' },
  { value: 'OK', label: 'Correct' },
  { value: 'HARD', label: 'Difficile' },
];

/** Fin de séance — FitZone App Entraînement.dc.html, D4. */
export default function SessionSummaryScreen() {
  const { workoutSets, elapsedSeconds, avgRestSeconds, programId, dayId } = useLocalSearchParams<{
    workoutSets: string;
    elapsedSeconds: string;
    avgRestSeconds?: string;
    programId?: string;
    dayId?: string;
  }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sets: FinishedSet[] = useMemo(() => JSON.parse(workoutSets ?? '[]'), [workoutSets]);
  const { data: history } = useMyWorkouts();
  const { data: exercises } = useExercises();
  const createWorkout = useCreateWorkoutLog();
  const uploadPostPhoto = useUploadPostPhoto();
  const createPost = useCreatePost();
  const [feeling, setFeeling] = useState<string>('OK');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const minutes = Math.round(Number(elapsedSeconds ?? 0) / 60);
  const volume = sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
  const restMinutes = Math.floor(Number(avgRestSeconds ?? 0) / 60);
  const restSecondsRemainder = Number(avgRestSeconds ?? 0) % 60;

  const personalRecords = useMemo(() => {
    if (!history || !exercises) return [];
    const bestByExercise = new Map<string, number>();
    for (const log of history) {
      for (const s of log.sets) {
        const w = Number(s.weightKg) || 0;
        if (!bestByExercise.has(s.exerciseId) || w > bestByExercise.get(s.exerciseId)!) {
          bestByExercise.set(s.exerciseId, w);
        }
      }
    }
    const records: { name: string; weight: number; reps: number }[] = [];
    for (const s of sets) {
      const prevBest = bestByExercise.get(s.exerciseId) ?? 0;
      if ((s.weightKg ?? 0) > prevBest) {
        const exercise = exercises.find((e) => e.id === s.exerciseId);
        if (exercise) records.push({ name: exercise.name, weight: s.weightKg!, reps: s.reps ?? 0 });
      }
    }
    return records;
  }, [history, exercises, sets]);

  const handleSave = () => {
    setError(null);
    createWorkout.mutate(
      {
        programId,
        dayId,
        feeling,
        durationMinutes: minutes,
        sets: sets.map((s) => ({ exerciseId: s.exerciseId, setNumber: s.setNumber, weightKg: s.weightKg, reps: s.reps })),
      },
      {
        onSuccess: () => setSaved(true),
        onError: () => setError('Erreur lors de l’enregistrement de la séance.'),
      },
    );
  };

  const applyPickedPhoto = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    setPhotoUri(result.assets[0].uri);
    setShared(false);
    setError(null);
  };

  const takeSessionPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Autorisez l’accès à l’appareil photo pour prendre une photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    applyPickedPhoto(result);
  };

  const pickSessionPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    applyPickedPhoto(result);
  };

  const pickSessionPhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir dans la galerie'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) takeSessionPhoto();
          if (index === 2) pickSessionPhotoFromLibrary();
        },
      );
      return;
    }
    Alert.alert('Ajouter une photo', undefined, [
      { text: 'Prendre une photo', onPress: takeSessionPhoto },
      { text: 'Choisir dans la galerie', onPress: pickSessionPhotoFromLibrary },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleShareToProfile = async () => {
    if (!photoUri) return;
    setSharing(true);
    setError(null);
    try {
      const contentType = 'image/jpeg';
      const { key } = await uploadPostPhoto.mutateAsync({ uri: photoUri, contentType });
      await createPost.mutateAsync({
        body: `Séance terminée 💪 ${minutes} min · ${Math.round(volume).toLocaleString('fr-FR')} kg au total`,
        imageKey: key,
      });
      setShared(true);
    } catch {
      setError('L’envoi de la photo a échoué. Réessayez.');
    } finally {
      setSharing(false);
    }
  };

  if (saved) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.trophyCircle}>
            <MaterialIcons name="emoji-events" size={44} color={colors.onAccent} />
          </View>
          <Text style={styles.successTitle}>Séance enregistrée</Text>

          {shared ? (
            <Banner tone="success" icon="check-circle" text="Publié sur votre profil." />
          ) : (
            <View style={styles.shareCard}>
              <Text style={styles.shareTitle}>Partager cette séance sur votre profil ?</Text>
              <Pressable onPress={pickSessionPhoto} style={styles.photoPicker}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={28} color={colors.muted} />
                    <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
                  </View>
                )}
              </Pressable>
              {error ? <Text style={styles.shareError}>{error}</Text> : null}
              {photoUri ? (
                <Button
                  label="Publier sur mon profil"
                  onPress={handleShareToProfile}
                  loading={sharing}
                  variant="secondary"
                />
              ) : null}
            </View>
          )}

          <Button
            label={!shared && photoUri ? 'Ignorer et quitter' : 'Quitter'}
            onPress={() => router.replace('/(member)/(tabs)/training')}
            variant={shared || !photoUri ? 'primary' : 'outline'}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.trophyCircle}>
          <MaterialIcons name="emoji-events" size={44} color={colors.onAccent} />
        </View>
        <Text style={styles.title}>Séance terminée</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {error ? <Banner tone="danger" icon="error" text={error} /> : null}

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatTile label="Durée" value={`${minutes} min`} />
            <StatTile label="Volume" value={`${Math.round(volume).toLocaleString('fr-FR')} kg`} />
          </View>
          <View style={styles.statsRow}>
            <StatTile label="Séries" value={`${sets.length}`} />
            <StatTile label="Repos moyen" value={Number(avgRestSeconds ?? 0) > 0 ? `${restMinutes}:${String(restSecondsRemainder).padStart(2, '0')}` : '—'} />
          </View>
        </View>

        {personalRecords.length > 0 ? (
          <View style={styles.recordsCard}>
            <Text style={styles.recordsTitle}>{personalRecords.length} record{personalRecords.length > 1 ? 's' : ''} personnel{personalRecords.length > 1 ? 's' : ''}</Text>
            {personalRecords.map((r, i) => (
              <Text key={i} style={styles.recordLine}>
                {r.name} — {r.weight} kg × {r.reps}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={{ width: '100%' }}>
          <Text style={styles.feelingLabel}>Ressenti</Text>
          <View style={styles.feelingRow}>
            {FEELINGS.map((f) => (
              <Pressable
                key={f.value}
                style={[styles.feelingChip, feeling === f.value && styles.feelingChipActive]}
                onPress={() => setFeeling(f.value)}
              >
                <Text
                  style={[styles.feelingChipText, feeling === f.value && styles.feelingChipTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button label={createWorkout.isPending ? 'Enregistrement…' : 'Enregistrer la séance'} onPress={handleSave} loading={createWorkout.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, alignItems: 'center', paddingBottom: 60 },
  trophyCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg,
  },
  title: { fontFamily: fonts.head, fontSize: 24, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  statsGrid: { gap: spacing.sm, width: '100%' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statTile: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, alignItems: 'center', gap: 2,
  },
  statValue: { fontFamily: fonts.head, fontSize: 19, color: colors.text },
  statLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
  recordsCard: { width: '100%', backgroundColor: colors.accentSoft, borderRadius: radii.md, padding: spacing.md, gap: 6 },
  recordsTitle: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.3, color: colors.accentInk, textTransform: 'uppercase' },
  recordLine: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text, textTransform: 'capitalize' },
  feelingLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginBottom: 8 },
  feelingRow: { flexDirection: 'row', gap: 8, width: '100%' },
  feelingChip: {
    flex: 1, height: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 6,
  },
  feelingChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  feelingChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, textAlign: 'center' },
  feelingChipTextActive: { color: colors.onSecondary },
  successContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  successTitle: { fontFamily: fonts.head, fontSize: 22, color: colors.text },
  shareCard: { width: '100%', gap: spacing.sm, alignItems: 'center' },
  shareTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14.5, color: colors.text, textAlign: 'center' },
  photoPicker: { width: '100%' },
  photoPreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.surface2 },
  photoPlaceholder: {
    width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.borderStrong,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface,
  },
  photoPlaceholderText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.muted },
  shareError: { fontFamily: fonts.body, fontSize: 12.5, color: colors.dangerInk, textAlign: 'center' },
  });
}
