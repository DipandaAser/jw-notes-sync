import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native"
import { useLayoutEffect } from "react"
import { useRouter, useNavigation } from "expo-router"
import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { Share2, RefreshCw, Eye, Star } from "lucide-react-native"
import { useTranslation } from "react-i18next"
import { useAppStore } from "../../src/stores/app"
import { getColors } from "../../src/theme"

export default function ExportScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = getColors(isDark)

  useLayoutEffect(() => {
    const parent = navigation.getParent()
    parent?.setOptions({ tabBarStyle: { display: "none" } })
    return () => {
      parent?.setOptions({ tabBarStyle: undefined })
    }
  }, [navigation])

  const mergeResult = useAppStore((s) => s.mergeResult)
  const archiveBytes = useAppStore((s) => s.archiveBytes)
  const mergeMode = useAppStore((s) => s.mergeMode)
  const openExplorer = useAppStore((s) => s.openExplorer)
  const reset = useAppStore((s) => s.reset)

  async function handleExport() {
    if (!archiveBytes) return

    try {
      const now = new Date().toISOString().split("T")[0]
      const fileName = `MergedBackup_${now}.jwlibrary`
      const file = new File(Paths.cache, fileName)

      file.write(archiveBytes)

      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: t("export.shareDialog"),
        })
      } else {
        Alert.alert(
          t("common.error"),
          t("export.shareError"),
        )
      }
    } catch (err) {
      Alert.alert(t("common.error"), err instanceof Error ? err.message : String(err))
    }
  }

  function handleNewMerge() {
    reset()
    if (mergeMode === 'library') {
      router.dismissTo("/(home)/library")
    } else {
      router.dismissTo("/(home)/")
    }
  }

  if (!mergeResult) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("export.noResult")}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(home)/")}
        >
          <Text style={styles.buttonText}>{t("export.back")}</Text>
        </Pressable>
      </View>
    )
  }

  const { stats } = mergeResult

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("export.success")}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {t("export.subtitle")}
      </Text>
      {mergeMode === 'library' && (
        <View style={styles.truthBadge}>
          <Star size={14} color={colors.primary} />
          <Text style={[styles.truthBadgeText, { color: colors.primary }]}>{t("export.savedAsTruth")}</Text>
        </View>
      )}

      <View
        style={[
          styles.statsGrid,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <StatItem label={t("stats.notes")} count={stats.notes} color={colors.accent1} />
        <StatItem
          label={t("stats.highlights")}
          count={stats.highlights}
          color={colors.accent2}
        />
        <StatItem
          label={t("stats.bookmarks")}
          count={stats.bookmarks}
          color={colors.accent3}
        />
        <StatItem
          label={t("stats.tags")}
          count={stats.tags}
          color={colors.accent4}
        />
        <StatItem
          label={t("stats.locations")}
          count={stats.locations}
          color={colors.accent5}
        />
        <StatItem
          label={t("stats.inputFields")}
          count={stats.inputFields}
          color={colors.accent6}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={handleExport}
        >
          <View style={styles.exportButtonContent}>
            <Share2 color="#ffffff" size={18} />
            <Text style={styles.exportButtonText}>
              {t("export.share")}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => {
            openExplorer(mergeResult.contents, t("explorer.mergedData"))
            router.push("/(home)/explorer")
          }}
        >
          <View style={styles.exportButtonContent}>
            <Eye color={colors.primary} size={16} />
            <Text style={[styles.buttonText, { color: colors.primary }]}>{t("explorer.exploreResult")}</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={handleNewMerge}
        >
          <View style={styles.exportButtonContent}>
            <RefreshCw color={colors.text} size={16} />
            <Text style={[styles.buttonText, { color: colors.text }]}>{mergeMode === 'library' ? t("export.backToLibrary") : t("export.newMerge")}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  )
}

function StatItem({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: color + "aa" }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  truthBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 20,
  },
  truthBadgeText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    marginBottom: 32,
  },
  statItem: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 12,
  },
  statCount: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    gap: 12,
  },
  exportButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  exportButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
})
