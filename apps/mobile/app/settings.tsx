import { View, Text, StyleSheet, Pressable, Linking, useColorScheme } from 'react-native';
import { Mail, Github } from 'lucide-react-native';
import { getColors } from '../src/theme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme === 'dark');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      <Pressable
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => Linking.openURL('mailto:aserdipanda@gmail.com?subject=JW Notes Sync - Feedback')}
      >
        <Mail color={colors.primary} size={22} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Envoyer un commentaire</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>aserdipanda@gmail.com</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => Linking.openURL('https://github.com/DipandaAser/jw-notes-sync')}
      >
        <Github color={colors.primary} size={22} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Voir le code source</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>GitHub</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
