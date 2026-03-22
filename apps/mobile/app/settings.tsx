import { View, Text, StyleSheet, Pressable, Linking, ScrollView, useColorScheme } from 'react-native';
import { Mail, Github, Globe, History, Trash2, Smartphone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../src/lib/i18n';
import { useAppStore } from '../src/stores/app';
import { getColors } from '../src/theme';

const languageLabels: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme === 'dark');
  const mergeHistory = useAppStore((s) => s.mergeHistory);
  const clearMergeHistory = useAppStore((s) => s.clearMergeHistory);

  function toggleLanguage() {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    setLanguage(next);
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.contentContainer}>

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

      {/* Merge History */}
      {mergeHistory.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <History color={colors.primary} size={18} />
            <Text style={[styles.historyTitle, { color: colors.text }]}>{t('history.title')}</Text>
            <Pressable onPress={clearMergeHistory} style={styles.clearBtn}>
              <Trash2 color={colors.error} size={14} />
              <Text style={[styles.clearText, { color: colors.error }]}>{t('history.clear')}</Text>
            </Pressable>
          </View>
          {mergeHistory.map((entry) => (
            <View key={entry.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.historyDate, { color: colors.text }]}>{formatDate(entry.date)}</Text>
              <View style={styles.historySources}>
                {entry.sources.map((s, i) => (
                  <View key={i} style={styles.sourceRow}>
                    <Smartphone color={colors.textMuted} size={12} />
                    <Text style={[styles.sourceName, { color: colors.textMuted }]}>{s.deviceName}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.historyStats, { color: colors.textMuted }]}>
                {entry.stats.notes} notes · {entry.stats.highlights} highlights · {entry.stats.bookmarks} bookmarks
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
  historySection: {
    marginTop: 28,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  historySources: {
    gap: 2,
    marginBottom: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceName: {
    fontSize: 12,
  },
  historyStats: {
    fontSize: 11,
    marginTop: 4,
  },
});
