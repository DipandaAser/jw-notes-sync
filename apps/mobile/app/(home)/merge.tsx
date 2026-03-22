import { useState, useEffect, useLayoutEffect } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme } from 'react-native'
import { useRouter, useNavigation } from 'expo-router'
import { Check, CircleDot, Circle, Settings2, ChevronDown, ChevronRight } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../src/stores/app'
import { runMerge } from '../../src/lib/merge'
import { getColors } from '../../src/theme'
import { presetToConfig, MERGE_PRESETS, type MergePreset, type MergeConfig } from '@jw-notes-sync/core'

export default function MergeScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

  const backups = useAppStore((s) => s.backups)
  const mergeStatus = useAppStore((s) => s.mergeStatus)
  const mergeProgress = useAppStore((s) => s.mergeProgress)
  const mergeError = useAppStore((s) => s.mergeError)
  const mergeConfig = useAppStore((s) => s.mergeConfig)
  const setMergeConfig = useAppStore((s) => s.setMergeConfig)
  const reset = useAppStore((s) => s.reset)

  const [showAdvanced, setShowAdvanced] = useState(false)

  useLayoutEffect(() => {
    const parent = navigation.getParent()
    parent?.setOptions({ tabBarStyle: { display: 'none' } })
    return () => {
      parent?.setOptions({ tabBarStyle: undefined })
    }
  }, [navigation])

  useEffect(() => {
    if (mergeStatus === 'done') {
      router.replace('/(home)/export')
    }
  }, [mergeStatus])

  function startMerge() {
    if (backups.length >= 2) {
      runMerge(backups[0]!.archive, backups[1]!.archive)
    }
  }

  function handleCancel() {
    reset()
    router.dismissTo('/(home)/')
  }

  function applyPreset(preset: MergePreset) {
    setMergeConfig(presetToConfig(preset))
  }

  function getActivePreset(): MergePreset | null {
    const c = mergeConfig
    if (c.notes === 'concatenate' && c.highlights === 'keepNewest' && c.inputFields === 'smartMerge') return 'keepAll'
    if (c.notes === 'keepA' && c.highlights === 'keepA' && c.inputFields === 'keepA') return 'preferA'
    if (c.notes === 'keepB' && c.highlights === 'keepB' && c.inputFields === 'keepB') return 'preferB'
    return null
  }

  const activePreset = getActivePreset()

  const presetLabels: Record<MergePreset, string> = {
    keepAll: t('config.preset.keepAll'),
    preferA: t('config.preset.preferA'),
    preferB: t('config.preset.preferB'),
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{t('merge.title')}</Text>

      {mergeStatus === 'idle' && (
        <>
          {/* Source comparison */}
          <View style={styles.sourcesRow}>
            {backups.slice(0, 2).map((b, i) => (
              <View key={b.id} style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.sourceBadge, { backgroundColor: i === 0 ? colors.primary : colors.accent2 }]}>
                  <Text style={styles.sourceBadgeText}>{i === 0 ? 'A' : 'B'}</Text>
                </View>
                <Text style={[styles.sourceDevice, { color: colors.text }]} numberOfLines={1}>{b.deviceName}</Text>
                <Text style={[styles.sourceStats, { color: colors.textMuted }]}>
                  {b.stats.notes} {t('stats.notes')} · {b.stats.highlights} {t('stats.highlights')}
                </Text>
              </View>
            ))}
          </View>

          {/* Config panel */}
          <View style={[styles.configPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.configHeader}>
              <Settings2 size={16} color={colors.primary} />
              <Text style={[styles.configTitle, { color: colors.text }]}>{t('config.title')}</Text>
            </View>

            {/* Presets */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('config.preset')}</Text>
            <View style={styles.presetsRow}>
              {MERGE_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  style={[styles.presetBtn, { backgroundColor: activePreset === preset ? colors.primary : colors.bg }]}
                  onPress={() => applyPreset(preset)}
                >
                  <Text style={[styles.presetText, { color: activePreset === preset ? '#fff' : colors.textMuted }]}>
                    {presetLabels[preset]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Advanced toggle */}
            <Pressable style={styles.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? <ChevronDown size={14} color={colors.textMuted} /> : <ChevronRight size={14} color={colors.textMuted} />}
              <Text style={[styles.advancedText, { color: colors.textMuted }]}>{t('config.advanced')}</Text>
            </Pressable>

            {showAdvanced && (
              <View style={styles.advancedSection}>
                <StrategyRow
                  label={t('config.strategy.notes')}
                  value={mergeConfig.notes}
                  options={[
                    { value: 'concatenate', label: t('config.notes.concatenate') },
                    { value: 'keepNewest', label: t('config.notes.keepNewest') },
                    { value: 'keepA', label: t('config.notes.keepA') },
                    { value: 'keepB', label: t('config.notes.keepB') },
                  ]}
                  onChange={(v) => setMergeConfig({ ...mergeConfig, notes: v as MergeConfig['notes'] })}
                  colors={colors}
                />
                <StrategyRow
                  label={t('config.strategy.highlights')}
                  value={mergeConfig.highlights}
                  options={[
                    { value: 'keepNewest', label: t('config.highlights.keepNewest') },
                    { value: 'keepA', label: t('config.highlights.keepA') },
                    { value: 'keepB', label: t('config.highlights.keepB') },
                  ]}
                  onChange={(v) => setMergeConfig({ ...mergeConfig, highlights: v as MergeConfig['highlights'] })}
                  colors={colors}
                />
                <StrategyRow
                  label={t('config.strategy.inputFields')}
                  value={mergeConfig.inputFields}
                  options={[
                    { value: 'smartMerge', label: t('config.inputFields.smartMerge') },
                    { value: 'keepA', label: t('config.inputFields.keepA') },
                    { value: 'keepB', label: t('config.inputFields.keepB') },
                  ]}
                  onChange={(v) => setMergeConfig({ ...mergeConfig, inputFields: v as MergeConfig['inputFields'] })}
                  colors={colors}
                />
              </View>
            )}
          </View>

          {/* Merge button */}
          <Pressable style={[styles.mergeBtn, { backgroundColor: colors.primary }]} onPress={startMerge}>
            <Text style={styles.mergeBtnText}>{t('merge.button')}</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
          </Pressable>
        </>
      )}

      {mergeStatus === 'merging' && (
        <>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${mergeProgress.percent}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.percentText, { color: colors.textMuted }]}>{mergeProgress.percent}%</Text>
          <View style={styles.stepsList}>
            {mergeProgress.steps.map((step) => (
              <View key={step.name} style={styles.stepRow}>
                {step.status === 'done' ? <Check size={14} color={colors.success} /> : step.status === 'current' ? <CircleDot size={14} color={colors.primary} /> : <Circle size={14} color={colors.border} />}
                <Text style={[styles.stepText, { color: step.status === 'pending' ? colors.textMuted : colors.text }, step.status === 'current' && { fontWeight: '600' }]}>
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
          <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => { useAppStore.getState().setMergeStatus('idle'); router.replace('/(home)/'); }}>
            <Text style={styles.retryButtonText}>{t('merge.retry')}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}

function StrategyRow({ label, value, options, onChange, colors }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; colors: any
}) {
  return (
    <View style={styles.strategyRow}>
      <Text style={[styles.strategyLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.strategyOptions}>
        {options.map((opt) => (
          <Pressable key={opt.value} style={[styles.strategyOpt, { backgroundColor: value === opt.value ? colors.primary : colors.bg }]} onPress={() => onChange(opt.value)}>
            <Text style={[styles.strategyOptText, { color: value === opt.value ? '#fff' : colors.textMuted }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  sourcesRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  sourceCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 6 },
  sourceBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sourceBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sourceDevice: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  sourceStats: { fontSize: 11, textAlign: 'center' },
  configPanel: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 20 },
  configHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  configTitle: { fontSize: 16, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  presetBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  presetText: { fontSize: 12, fontWeight: '600' },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  advancedText: { fontSize: 13 },
  advancedSection: { marginTop: 12, gap: 12 },
  strategyRow: { gap: 6 },
  strategyLabel: { fontSize: 13 },
  strategyOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  strategyOpt: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  strategyOptText: { fontSize: 11, fontWeight: '600' },
  mergeBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  mergeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14 },
  progressBarBg: { height: 8, borderRadius: 4, backgroundColor: '#e5e7eb30', overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  percentText: { fontSize: 14, textAlign: 'right', marginBottom: 24 },
  stepsList: { gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { fontSize: 15 },
  errorContainer: { alignItems: 'center', paddingVertical: 40 },
  errorTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  errorMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
})
