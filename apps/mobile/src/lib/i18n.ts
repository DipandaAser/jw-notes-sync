import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fr, en, defaultLocale, supportedLocales } from "@jw-notes-sync/i18n";
import type { SupportedLocale } from "@jw-notes-sync/i18n";

const STORAGE_KEY = "jw-notes-sync-lang";

function getDeviceLocale(): SupportedLocale {
  const locales = getLocales();
  const code = locales[0]?.languageCode ?? defaultLocale;
  if ((supportedLocales as readonly string[]).includes(code)) {
    return code as SupportedLocale;
  }
  return defaultLocale;
}

// Initialize synchronously with device locale
i18next.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: getDeviceLocale(),
  fallbackLng: defaultLocale,
  supportedLngs: supportedLocales as unknown as string[],
  interpolation: { escapeValue: false },
});

// Restore saved preference (overrides device locale if user previously chose manually)
AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  if (saved && (supportedLocales as readonly string[]).includes(saved) && saved !== i18next.language) {
    i18next.changeLanguage(saved);
  }
});

// When app returns to foreground, follow device locale unless user set a manual preference
AppState.addEventListener("change", (state) => {
  if (state !== "active") return;
  AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
    if (saved) return; // user has a manual preference, respect it
    const deviceLocale = getDeviceLocale();
    if (deviceLocale !== i18next.language) {
      i18next.changeLanguage(deviceLocale);
    }
  });
});

/** Call this from Settings to set language manually (persists the choice). */
export async function setLanguage(locale: SupportedLocale) {
  await AsyncStorage.setItem(STORAGE_KEY, locale);
  await i18next.changeLanguage(locale);
}

/** Call this to reset to device language (clears manual preference). */
export async function resetToDeviceLanguage() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await i18next.changeLanguage(getDeviceLocale());
}

export default i18next;
