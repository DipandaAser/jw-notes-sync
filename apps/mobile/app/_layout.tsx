import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as Linking from 'expo-linking';
import { importFromUri } from '../src/lib/import';
import { getColors } from '../src/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  useEffect(() => {
    // Handle incoming file shares
    const subscription = Linking.addEventListener('url', async (event) => {
      if (event.url) {
        try {
          await importFromUri(event.url);
        } catch (err) {
          console.warn('Failed to import shared file:', err);
        }
      }
    });

    // Check for initial URL (app opened via file share)
    Linking.getInitialURL().then(async (url) => {
      if (url) {
        try {
          await importFromUri(url);
        } catch (err) {
          console.warn('Failed to import initial file:', err);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'JW Notes Sync' }}
      />
      <Stack.Screen
        name="merge"
        options={{ title: 'Fusion' }}
      />
      <Stack.Screen
        name="export"
        options={{ title: 'Exporter' }}
      />
    </Stack>
  );
}
