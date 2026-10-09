import { useMemo } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

const MAX_SHEET_HEIGHT = Dimensions.get('window').height * 0.85;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Désactive le scroll vertical du contenu (par ex. quand le contenu gère
   * son propre geste, comme un swipe horizontal). Par défaut activé. */
  scrollEnabled?: boolean;
}

export function BottomSheet({ visible, onClose, children, scrollEnabled = true }: BottomSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoider}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            scrollEnabled={scrollEnabled}
            bounces={scrollEnabled}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(14,17,23,0.45)' },
    keyboardAvoider: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingTop: 10,
      maxHeight: MAX_SHEET_HEIGHT,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.borderStrong,
      alignSelf: 'center',
      marginBottom: 10,
    },
  });
}
