import fr from "./locales/fr.json" with { type: "json" };
import en from "./locales/en.json" with { type: "json" };

export type MessageKeys = keyof typeof fr;

export const messages = { fr, en } as const;

export const supportedLocales = ["fr", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

export { fr, en };
