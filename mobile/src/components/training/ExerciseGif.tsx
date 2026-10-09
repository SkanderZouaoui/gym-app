import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface ExerciseGifProps {
  uri: string | null;
  size?: number;
}

const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.m4v', '.webm'];

function isVideoUri(uri: string): boolean {
  const path = uri.split('?')[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/** Démonstration d'un exercice : vidéo HD (wger.de) si `mediaKey` pointe vers
 * un fichier vidéo, sinon image/GIF (voir backend/prisma/seed-data/README.md
 * pour la provenance des médias). */
export function ExerciseGif({ uri, size = 72 }: ExerciseGifProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!uri) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <MaterialIcons name="fitness-center" size={size * 0.4} color={colors.border} />
      </View>
    );
  }

  const mediaStyle = { width: size, height: size, borderRadius: radii.sm, backgroundColor: colors.surface2 };

  if (isVideoUri(uri)) {
    return <ExerciseVideo uri={uri} style={mediaStyle} />;
  }

  return <Image source={{ uri }} style={mediaStyle} contentFit="contain" autoplay />;
}

interface ExerciseVideoProps {
  uri: string;
  style: { width: number; height: number; borderRadius: number; backgroundColor: string };
}

function ExerciseVideo({ uri, style }: ExerciseVideoProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return <VideoView player={player} style={style} contentFit="contain" nativeControls={false} />;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    placeholder: {
      borderRadius: radii.sm, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
    },
  });
}
