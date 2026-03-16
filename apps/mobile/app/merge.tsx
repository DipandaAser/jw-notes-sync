import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/stores/app';
import { runMerge } from '../src/lib/merge';

export default function MergeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  const backups = useAppStore((s) => s.backups);
  const mergeStatus = useAppStore((s) => s.mergeStatus);
  const mergeProgress = useAppStore((s) => s.mergeProgress);
  const mergeError = useAppStore((s) => s.mergeError);

  useEffect(() => {
    if (mergeStatus === 'idle' && backups.length >= 2) {
      runMerge(backups[0]!.archive, backups[1]!.archive);
    }
  }, []);

  useEffect(() => {
    if (mergeStatus === 'done') {
      router.replace('/export');
    }
  }, [mergeStatus]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Fusion en cours</Text>

      {mergeStatus === 'merging' && (
        <>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${mergeProgress.percent}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.percentText, { color: colors.textMuted }]}>
            {mergeProgress.percent}%
          </Text>

          <View style={styles.stepsList}>
            {mergeProgress.steps.map((step) => (
              <View key={step.name} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    step.status === 'done' && { backgroundColor: colors.success },
                    step.status === 'current' && { backgroundColor: colors.primary },
                    step.status === 'pending' && { backgroundColor: colors.border },
                  ]}
                />
                <Text
                  style={[
                    styles.stepText,
                    { color: step.status === 'pending' ? colors.textMuted : colors.text },
                    step.status === 'current' && { fontWeight: '600' },
                  ]}
                >
                  {step.name}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {mergeStatus === 'error' && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.error }]}>Erreur</Text>
          <Text style={[styles.errorMessage, { color: colors.textMuted }]}>{mergeError}</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              useAppStore.getState().setMergeStatus('idle');
              router.replace('/');
            }}
          >
            <Text style={styles.retryButtonText}>Retour</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function getColors(isDark: boolean) {
  return isDark
    ? {
        bg: '#0f0f1e',
        text: '#e8e8f0',
        textMuted: '#8888a0',
        border: '#2a2a40',
        primary: '#4a6cf7',
        success: '#34d399',
        error: '#f87171',
      }
    : {
        bg: '#ffffff',
        text: '#1a1a2e',
        textMuted: '#6b7280',
        border: '#e5e7eb',
        primary: '#4a6cf7',
        success: '#059669',
        error: '#dc2626',
      };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb30',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 24,
  },
  stepsList: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    fontSize: 15,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
