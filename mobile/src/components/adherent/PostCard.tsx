import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts, radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, Pill } from '../ui';

interface PostCardProps {
  authorName: string;
  authorInitial: string;
  authorPhotoUrl?: string | null;
  createdAt: string;
  body: string;
  imageUrl?: string | null;
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  isCoach?: boolean;
  pinned?: boolean;
  onReact?: () => void;
  onReport?: () => void;
}

/** Carte de publication du fil Communauté — FitZone App Compte.dc.html, J1. */
export function PostCard({
  authorName, authorInitial, authorPhotoUrl, createdAt, body, imageUrl, likeCount, commentCount, liked, isCoach, pinned, onReact, onReport,
}: PostCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      {pinned ? (
        <View style={styles.pinnedRow}>
          <MaterialIcons name="push-pin" size={13} color={colors.infoInk} />
          <Text style={styles.pinnedText}>Épinglé par la salle</Text>
        </View>
      ) : null}
      <View style={styles.header}>
        {authorPhotoUrl ? (
          <Image source={{ uri: authorPhotoUrl }} style={styles.avatarImage} />
        ) : (
          <Avatar initials={authorInitial} size={36} />
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{authorName}</Text>
            {isCoach ? <Pill label="COACH" tone="info" /> : null}
          </View>
          <Text style={styles.date}>{new Date(createdAt).toLocaleDateString('fr-FR')}</Text>
        </View>
        {onReport ? (
          <Pressable onPress={onReport} hitSlop={8}>
            <MaterialIcons name="more-horiz" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.body}>{body}</Text>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.postImage} /> : null}
      <View style={styles.footer}>
        <Pressable onPress={onReact} style={styles.actionButton}>
          <MaterialIcons name={liked ? 'favorite' : 'favorite-border'} size={18} color={liked ? colors.danger : colors.muted} />
          <Text style={styles.actionCount}>{likeCount}</Text>
        </Pressable>
        <View style={styles.actionButton}>
          <MaterialIcons name="mode-comment" size={17} color={colors.muted} />
          <Text style={styles.actionCount}>{commentCount}</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
      padding: spacing.md, gap: 10,
    },
    pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pinnedText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.infoInk },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.text },
    date: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted },
    body: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20 },
    postImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.sm, backgroundColor: colors.surface2 },
    footer: { flexDirection: 'row', gap: 16 },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionCount: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.muted },
  });
}
