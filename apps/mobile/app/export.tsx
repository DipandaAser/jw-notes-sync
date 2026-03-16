import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native"
import { useRouter } from "expo-router"
import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { useAppStore } from "../src/stores/app"
import { getColors } from "../src/theme"

export default function ExportScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = getColors(isDark)

  const mergeResult = useAppStore((s) => s.mergeResult)
  const archiveBytes = useAppStore((s) => s.archiveBytes)
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
          // mimeType: 'application/zip',

          dialogTitle: "Exporter la sauvegarde fusionnée",
        })
      } else {
        Alert.alert(
          "Erreur",
          "Le partage n'est pas disponible sur cet appareil",
        )
      }
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : String(err))
    }
  }

  function handleNewMerge() {
    reset()
    router.replace("/")
  }

  if (!mergeResult) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Aucun résultat
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.buttonText}>Retour</Text>
        </Pressable>
      </View>
    )
  }

  const { stats } = mergeResult

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Fusion terminée !
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Votre sauvegarde fusionnée est prête
      </Text>

      <View
        style={[
          styles.statsGrid,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <StatItem label="Notes" count={stats.notes} color={colors.accent1} />
        <StatItem
          label="Surlignages"
          count={stats.highlights}
          color={colors.accent2}
        />
        <StatItem
          label="Signets"
          count={stats.bookmarks}
          color={colors.accent3}
        />
        <StatItem
          label="Étiquettes"
          count={stats.tags}
          color={colors.accent4}
        />
        <StatItem
          label="Emplacements"
          count={stats.locations}
          color={colors.accent5}
        />
        <StatItem
          label="Formulaires"
          count={stats.inputFields}
          color={colors.accent6}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.exportButton, { backgroundColor: colors.primary }]}
          onPress={handleExport}
        >
          <Text style={styles.exportButtonText}>
            Partager le fichier .jwlibrary
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={handleNewMerge}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            Nouvelle fusion
          </Text>
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
    marginBottom: 28,
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
