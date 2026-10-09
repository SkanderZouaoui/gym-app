import { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { fonts, radii, spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeContext';
import { useBodyMetrics, useCreateBodyMetric, useUploadProgressPhoto } from '../../src/hooks/useProgress';
import { Banner, EmptyState } from '../../src/components/ui';

/** Photos de progression — FitZone App Entraînement.dc.html, F3.
 * Privées par défaut : jamais partagées, URLs présignées à courte durée de vie. */
export default function PhotosScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data: metrics, isLoading } = useBodyMetrics();
  const createMetric = useCreateBodyMetric();
  const uploadPhoto = useUploadProgressPhoto();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const photos = useMemo(() => (metrics ?? []).filter((m) => m.photoUrl), [metrics]);
  const oldest = photos[photos.length - 1];
  const newest = photos[0];

  const handleAddPhoto = async () => {
    setUploadError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError('Autorisez l’accès à vos photos pour en ajouter une.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const contentType = asset.mimeType ?? 'image/jpeg';
      const { key } = await uploadPhoto.mutateAsync({ uri: asset.uri, contentType });
      await createMetric.mutateAsync({ photoKey: key, visibility: 'PRIVATE' });
    } catch {
      setUploadError('Échec de l’envoi de la photo. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <ScreenHeader title="Mes photos" fallbackHref="/(member)/(tabs)/training" />
        <View style={styles.privateBadge}>
          <MaterialIcons name="lock" size={13} color={colors.secondaryInk} />
          <Text style={styles.privateBadgeText}>Privé</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Banner
          tone="info"
          icon="shield"
          title="Visibles par vous uniquement"
          text="Stockées chiffrées, jamais partagées avec la salle ni votre coach sans votre accord. Supprimables à tout moment."
        />

        {uploadError ? <Banner tone="danger" icon="error" text={uploadError} /> : null}

        {photos.length === 0 ? (
          <EmptyState
            icon="add-a-photo"
            title="Aucune photo"
            text="Une photo par mois, même lumière et même pose : le meilleur moyen de voir des progrès que la balance ne montre pas."
            tone="primary"
            actionLabel={uploading ? 'Envoi…' : 'Prendre une photo'}
            onAction={uploading ? undefined : handleAddPhoto}
          />
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            ListHeaderComponent={
              <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
                {photos.length >= 2 && oldest && newest ? (
                  <View style={styles.compareRow}>
                    <View style={styles.compareTile}>
                      <Image source={{ uri: oldest.photoUrl! }} style={styles.compareImage} />
                      <Text style={styles.compareCaption}>
                        {new Date(oldest.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        {oldest.weightKg ? ` · ${oldest.weightKg} kg` : ''}
                      </Text>
                    </View>
                    <View style={styles.compareTile}>
                      <Image source={{ uri: newest.photoUrl! }} style={styles.compareImage} />
                      <Text style={[styles.compareCaption, styles.compareCaptionActive]}>
                        {new Date(newest.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        {newest.weightKg ? ` · ${newest.weightKg} kg` : ''}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>TOUTES LES PHOTOS</Text>
                  <Pressable onPress={uploading ? undefined : handleAddPhoto} style={styles.addIconButton}>
                    {uploading ? <ActivityIndicator size="small" color={colors.primaryInk} /> : <MaterialIcons name="add" size={18} color={colors.primaryInk} />}
                  </Pressable>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: item.photoUrl! }} style={styles.thumbImage} />
                <View style={styles.thumbDateBadge}>
                  <Text style={styles.thumbDateText}>
                    {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.gridContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg },
  privateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondarySoft,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  privateBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.secondaryInk },
  content: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  compareRow: { flexDirection: 'row', gap: spacing.sm },
  compareTile: { flex: 1, gap: 6 },
  compareImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.md, backgroundColor: colors.surface2 },
  compareCaption: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted, textAlign: 'center' },
  compareCaptionActive: { color: colors.primaryInk },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.5, color: colors.muted },
  addIconButton: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  gridContent: { paddingBottom: 60 },
  gridRow: { gap: spacing.sm, marginBottom: spacing.sm },
  thumbWrap: { flex: 1, position: 'relative' },
  thumbImage: { width: '100%', aspectRatio: 1, borderRadius: radii.sm, backgroundColor: colors.surface2 },
  thumbDateBadge: {
    position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2,
  },
  thumbDateText: { fontFamily: fonts.bodySemiBold, fontSize: 9.5, color: '#fff' },
  });
}
