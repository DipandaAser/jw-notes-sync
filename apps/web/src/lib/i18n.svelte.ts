import i18next from "i18next";
import { fr, en, defaultLocale, supportedLocales } from "@jw-notes-sync/i18n";
import type { SupportedLocale } from "@jw-notes-sync/i18n";

const STORAGE_KEY = "jw-notes-sync-lang";

function getBrowserLocale(): SupportedLocale {
	const code = navigator.language?.substring(0, 2);
	if (code && (supportedLocales as readonly string[]).includes(code)) {
		return code as SupportedLocale;
	}
	return defaultLocale;
}

let initialized = false;

export async function initI18n() {
	if (initialized) return;
	initialized = true;

	const saved = localStorage.getItem(STORAGE_KEY);
	const lng =
		saved && (supportedLocales as readonly string[]).includes(saved)
			? (saved as SupportedLocale)
			: getBrowserLocale();

	await i18next.init({
		resources: {
			fr: { translation: fr },
			en: { translation: en },
		},
		lng,
		fallbackLng: defaultLocale,
		supportedLngs: supportedLocales as unknown as string[],
		interpolation: { escapeValue: false },
	});

	// React to browser language changes when tab regains focus (no manual override)
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible") return;
		if (localStorage.getItem(STORAGE_KEY)) return; // user has manual preference
		const browserLocale = getBrowserLocale();
		if (browserLocale !== i18next.language) {
			i18next.changeLanguage(browserLocale);
		}
	});
}

// Svelte 5 reactive wrapper
let _locale = $state<SupportedLocale>(
	(i18next.language?.substring(0, 2) as SupportedLocale) || defaultLocale,
);
let _tick = $state(0);

i18next.on("languageChanged", (lng: string) => {
	_locale = lng.substring(0, 2) as SupportedLocale;
	_tick++;
});

export function t(key: string, options?: Record<string, unknown>): string {
	void _tick;
	return String(i18next.t(key, options as never));
}

export function getLocale(): SupportedLocale {
	return _locale;
}

/** Set language manually (persists the choice, ignores browser language changes). */
export async function setLocale(locale: SupportedLocale) {
	localStorage.setItem(STORAGE_KEY, locale);
	await i18next.changeLanguage(locale);
}

export { supportedLocales, type SupportedLocale };
