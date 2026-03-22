import { View, Text, StyleSheet, Pressable, FlatList, Alert, useColorScheme } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Plus, Eye } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../src/stores/app';
import { pickAndImportBackup } from '../../src/lib/import';
import { getColors } from '../../src/theme';
import { useState } from 'react';

export default function ImportScreen() {
  const router = useRouter();
  const sourceOfTruth = useAppStore((s) => s.sourceOfTruth);
  const mergeMode = useAppStore((s) => s.mergeMode);

  // Redirect to library if there's a source of truth and we're not in quick merge mode
  if (sourceOfTruth && mergeMode !== 'quick') {
    return <Redirect href="/(home)/library" />;
  }
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  const backups = useAppStore((s) => s.backups);
  const removeBackup = useAppStore((s) => s.removeBackup);
  const canMerge = useAppStore((s) => s.canMerge);
  const goTo = useAppStore((s) => s.goTo);

  const openExplorer = useAppStore((s) => s.openExplorer);
  const [importing, setImporting] = useState(false);

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      await pickAndImportBackup();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  function handleMerge() {
    if (!canMerge()) return;
    goTo('merge');
    router.push('/(home)/merge');
  }

  function handleRemove(id: string) {
    Alert.alert(t('import.backups.remove'), t('import.backups.removeConfirm'), [
      { text: t('import.backups.cancel'), style: 'cancel' },
      { text: t('import.backups.remove'), style: 'destructive', onPress: () => removeBackup(id) },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('import.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {t('import.subtitle')}
      </Text>

      <Pressable
        style={[styles.importButton, { backgroundColor: colors.primary }, importing && styles.buttonDisabled]}
        onPress={handleImport}
        disabled={importing}
      >
        <View style={styles.importButtonContent}>
          <Plus color="#ffffff" size={18} />
          <Text style={styles.importButtonText}>
            {importing ? t('import.button.loading') : t('import.button')}
          </Text>
        </View>
      </Pressable>

      <FlatList
        data={backups}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={backups.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('import.backups.empty')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onLongPress={() => handleRemove(item.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.deviceName, { color: colors.text, flex: 1 }]}>{item.deviceName}</Text>
              <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(item.date)}</Text>
              <Pressable
                style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  openExplorer(item.archive.database, item.deviceName);
                  router.push('/(home)/explorer');
                }}
              >
                <Eye size={14} color="#fff" />
              </Pressable>
            </View>
            <Text style={[styles.fileName, { color: colors.textMuted }]}>{item.fileName}</Text>
            <View style={styles.statsRow}>
              <StatBadge label={t('stats.notes')} count={item.stats.notes} color={colors.accent1} />
              <StatBadge label={t('stats.highlights')} count={item.stats.highlights} color={colors.accent2} />
              <StatBadge label={t('stats.bookmarks')} count={item.stats.bookmarks} color={colors.accent3} />
              <StatBadge label={t('stats.tags')} count={item.stats.tags} color={colors.accent4} />
            </View>
          </Pressable>
        )}
      />

      {backups.length >= 2 && (
        <Pressable
          style={[styles.mergeButton, { backgroundColor: colors.primary }]}
          onPress={handleMerge}
        >
          <Text style={styles.mergeButtonText}>
            {t('import.merge', { count: backups.length })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeCount, { color }]}>{count}</Text>
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  importButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  importButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  importButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
  },
  fileName: {
    fontSize: 13,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeLabel: {
    fontSize: 11,
  },
  exploreBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 8,
  },
  mergeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  mergeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
