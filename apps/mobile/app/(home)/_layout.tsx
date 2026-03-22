import { Stack } from "expo-router"
import { useColorScheme } from "react-native"
import { useTranslation } from "react-i18next"
import { getColors } from "../../src/theme"

export default function HomeLayout() {
  const { t } = useTranslation()
  const colorScheme = useColorScheme()
  const colors = getColors(colorScheme === "dark")

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "JW Notes Sync" }} />
      <Stack.Screen
        name="merge"
        options={{
          title: t("merge.title"),
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          title: t("export.title"),
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="explorer"
        options={{
          title: t("explorer.title"),
          headerShown: false,
        }}
      />
    </Stack>
  )
}
