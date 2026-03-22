import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { parseJWLibrary } from '@jw-notes-sync/core'
import { Plus, Merge, Download, Eye, Smartphone, Loader } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useAppStore, type ImportedBackup } from '../../src/stores/app'
import { nativeAdapter } from '../../src/adapter'
import { loadBackupBytes } from '../../src/lib/storage'
import { getColors } from '../../src/theme'

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default function LibraryScreen() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

  const sourceOfTruth = useAppStore((s) => s.sourceOfTruth)
  const recentFiles = useAppStore((s) => s.recentFiles)
  const openExplorer = useAppStore((s) => s.openExplorer)
  const startLibraryMerge = useAppStore((s) => s.startLibraryMerge)
  const startQuickMerge = useAppStore((s) => s.startQuickMerge)

  const [addingFile, setAddingFile] = useState(false)
  const [downloadingTruth, setDownloadingTruth] = useState(false)

  const originals = recentFiles.filter((m) => !m.isMerged)

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return iso }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleAddBackup() {
    if (addingFile) return
    setAddingFile(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })
      if (result.canceled || result.assets.length === 0) return
      const asset = result.assets[0]!
      if (!asset.name.endsWith('.jwlibrary')) {
        Alert.alert(t('common.error'), t('import.error.notJwlibrary', { name: asset.name }))
        return
      }

      const file = new File(asset.uri)
      const base64 = await file.base64()
      const bytes = base64ToUint8Array(base64)
      const archive = await parseJWLibrary(nativeAdapter, bytes)
      const db = archive.database

      const backup: ImportedBackup = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: asset.name,
        deviceName: archive.manifest.userDataBackup.deviceName,
        date: archive.manifest.creationDate,
        archive,
        stats: {
          notes: db.notes.length,
          highlights: db.userMarks.length,
          bookmarks: db.bookmarks.length,
          tags: db.tags.length,
        },
      }

      useAppStore.getState().addBackup(backup, bytes)
      const ok = await startLibraryMerge(backup)
      if (ok) router.push('/(home)/merge')
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err))
    } finally {
      setAddingFile(false)
    }
  }

  async function handleDownloadTruth() {
    if (!sourceOfTruth || downloadingTruth) return
    setDownloadingTruth(true)
    try {
      const bytes = await loadBackupBytes(sourceOfTruth.id)
      if (!bytes) return
      const { default: Sharing } = await import('expo-sharing')
      const { File: FSFile, Paths } = await import('expo-file-system')
      const file = new FSFile(Paths.cache, sourceOfTruth.fileName)
      file.write(bytes)
      await Sharing.shareAsync(file.uri, { dialogTitle: t('export.shareDialog') })
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : String(err))
    } finally {
      setDownloadingTruth(false)
    }
  }

  async function handleExploreTruth() {
    if (!sourceOfTruth) return
    const bytes = await loadBackupBytes(sourceOfTruth.id)
    if (!bytes) return
    const archive = await parseJWLibrary(nativeAdapter, bytes)
    openExplorer(archive.database, sourceOfTruth.deviceName)
    router.push('/(home)/explorer')
  }

  function handleQuickMerge() {
    startQuickMerge()
    router.push('/(home)/')
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{t('library.title')}</Text>

      {/* Source of truth */}
      {sourceOfTruth && (
        <View style={[styles.truthCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.truthHeader}>
            <Text style={[styles.truthDevice, { color: colors.text }]}>{sourceOfTruth.deviceName}</Text>
            <Text style={[styles.truthDate, { color: colors.textMuted }]}>{formatDate(sourceOfTruth.date)}</Text>
          </View>
          <Text style={[styles.truthFile, { color: colors.textMuted }]}>
            {sourceOfTruth.fileName} · {formatBytes(sourceOfTruth.sizeBytes)}
          </Text>
          <View style={styles.statsRow}>
            <StatBadge label={t('stats.notes')} count={sourceOfTruth.stats.notes} color={colors.accent1} />
            <StatBadge label={t('stats.highlights')} count={sourceOfTruth.stats.highlights} color={colors.accent2} />
            <StatBadge label={t('stats.bookmarks')} count={sourceOfTruth.stats.bookmarks} color={colors.accent3} />
            <StatBadge label={t('stats.tags')} count={sourceOfTruth.stats.tags} color={colors.accent4} />
          </View>
          <Text style={[styles.truthDesc, { color: colors.textMuted }]}>{t('library.sourceOfTruth.desc')}</Text>
          <View style={styles.truthActions}>
            <Pressable style={[styles.truthBtn, { backgroundColor: colors.primary }]} onPress={handleDownloadTruth} disabled={downloadingTruth}>
              {downloadingTruth ? <Loader size={14} color="#fff" /> : <Download size={14} color="#fff" />}
              <Text style={styles.truthBtnText}>{t('library.download')}</Text>
            </Pressable>
            <Pressable style={[styles.truthBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} onPress={handleExploreTruth}>
              <Eye size={14} color={colors.textMuted} />
              <Text style={[styles.truthBtnLabel, { color: colors.textMuted }]}>{t('explorer.explore')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAddBackup} disabled={addingFile}>
          {addingFile ? <Loader size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
          <Text style={styles.addBtnText}>{t('library.addBackup')}</Text>
        </Pressable>
        <Pressable style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleQuickMerge}>
          <Merge size={18} color={colors.textMuted} />
          <Text style={[styles.quickBtnText, { color: colors.textMuted }]}>{t('library.quickMerge')}</Text>
        </Pressable>
      </View>

      {/* Original files */}
      {originals.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('library.originals')}</Text>
          {originals.map((meta) => (
            <View key={meta.id} style={[styles.fileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fileHeader}>
                <Smartphone size={16} color={colors.textMuted} />
                <Text style={[styles.fileDevice, { color: colors.text }]} numberOfLines={1}>{meta.deviceName}</Text>
                <Text style={[styles.fileDate, { color: colors.textMuted }]}>{formatDate(meta.date)}</Text>
              </View>
              <Text style={[styles.fileInfo, { color: colors.textMuted }]}>{meta.fileName} · {formatBytes(meta.sizeBytes)}</Text>
              <View style={styles.statsRow}>
                <StatBadge label={t('stats.notes')} count={meta.stats.notes} color={colors.accent1} />
                <StatBadge label={t('stats.highlights')} count={meta.stats.highlights} color={colors.accent2} />
                <StatBadge label={t('stats.bookmarks')} count={meta.stats.bookmarks} color={colors.accent3} />
                <StatBadge label={t('stats.tags')} count={meta.stats.tags} color={colors.accent4} />
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeCount, { color }]}>{count}</Text>
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  truthCard: { borderRadius: 12, borderWidth: 2, padding: 16, marginBottom: 20 },
  truthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  truthDevice: { fontSize: 18, fontWeight: '700', flex: 1 },
  truthDate: { fontSize: 12 },
  truthFile: { fontSize: 12, marginBottom: 12 },
  truthDesc: { fontSize: 12, marginBottom: 12 },
  truthActions: { flexDirection: 'row', gap: 8 },
  truthBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  truthBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  truthBtnLabel: { fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  quickBtnText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  fileCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  fileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  fileDevice: { flex: 1, fontSize: 14, fontWeight: '600' },
  fileDate: { fontSize: 11 },
  fileInfo: { fontSize: 11, marginBottom: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeCount: { fontSize: 13, fontWeight: '700' },
  badgeLabel: { fontSize: 11 },
})
