import { useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Check, CircleDot, Circle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../src/stores/app';
import { runMerge } from '../../src/lib/merge';
import { getColors } from '../../src/theme';

export default function MergeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  const backups = useAppStore((s) => s.backups);
  const mergeStatus = useAppStore((s) => s.mergeStatus);
  const mergeProgress = useAppStore((s) => s.mergeProgress);
  const mergeError = useAppStore((s) => s.mergeError);

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  useEffect(() => {
    if (mergeStatus === 'idle' && backups.length >= 2) {
      runMerge(backups[0]!.archive, backups[1]!.archive);
    }
  }, []);

  useEffect(() => {
    if (mergeStatus === 'done') {
      router.replace('/(home)/export');
    }
  }, [mergeStatus]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('merge.title')}</Text>

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
                {step.status === 'done' ? (
                  <Check size={14} color={colors.success} />
                ) : step.status === 'current' ? (
                  <CircleDot size={14} color={colors.primary} />
                ) : (
                  <Circle size={14} color={colors.border} />
                )}
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
          <Text style={[styles.errorTitle, { color: colors.error }]}>{t('merge.error')}</Text>
          <Text style={[styles.errorMessage, { color: colors.textMuted }]}>{mergeError}</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              useAppStore.getState().setMergeStatus('idle');
              router.replace('/(home)/');
            }}
          >
            <Text style={styles.retryButtonText}>{t('merge.retry')}</Text>
          </Pressable>
        </View>
      )}
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
