import { Stack } from "expo-router"
import { useColorScheme } from "react-native"
import { getColors } from "../../src/theme"

export default function HomeLayout() {
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
          title: "Fusion",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          title: "Exporter",
          headerBackVisible: false,
        }}
      />
    </Stack>
  )
}
