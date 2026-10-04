import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MuscleUP</Text>
      <Text style={styles.subtitle}>L'app démarre — écrans à venir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F9',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#14213D',
  },
  subtitle: {
    fontSize: 14,
    color: '#5B6270',
  },
});
