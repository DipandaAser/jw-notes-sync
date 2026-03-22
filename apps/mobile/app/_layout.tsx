import { Tabs } from "expo-router"
import { useEffect } from "react"
import { useColorScheme } from "react-native"
import * as Linking from "expo-linking"
import { House, Settings } from "lucide-react-native"
import { useTranslation } from "react-i18next"
import "../src/lib/i18n"
import { importFromUri } from "../src/lib/import"
import { useAppStore } from "../src/stores/app"
import { getColors } from "../src/theme"

export default function RootLayout() {
  const { t } = useTranslation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const colors = getColors(isDark)

  useEffect(() => {
    useAppStore.getState().loadPersistedConfig()
  }, [])

  useEffect(() => {
    const subscription = Linking.addEventListener("url", async (event) => {
      if (event.url) {
        try {
          await importFromUri(event.url)
        } catch (err) {
          console.warn("Failed to import shared file:", err)
        }
      }
    })

    Linking.getInitialURL().then(async (url) => {
      if (url) {
        try {
          await importFromUri(url)
        } catch (err) {
          console.warn("Failed to import initial file:", err)
        }
      }
    })

    return () => subscription.remove()
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("nav.settings"),
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "600" },
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
