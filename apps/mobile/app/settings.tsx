import { View, Text, StyleSheet, Pressable, Linking, useColorScheme } from 'react-native';
import { Mail, Github, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../src/lib/i18n';
import { getColors } from '../src/theme';

const languageLabels: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme === 'dark');

  function toggleLanguage() {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    setLanguage(next);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      <Pressable
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={toggleLanguage}
      >
        <Globe color={colors.primary} size={22} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('settings.language')}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{languageLabels[i18n.language] ?? i18n.language}</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => Linking.openURL('mailto:aserdipanda@gmail.com?subject=JW Notes Sync - Feedback')}
      >
        <Mail color={colors.primary} size={22} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('settings.feedback')}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>aserdipanda@gmail.com</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => Linking.openURL('https://github.com/DipandaAser/jw-notes-sync')}
      >
        <Github color={colors.primary} size={22} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('settings.source')}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t('settings.sourceLabel')}</Text>
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
