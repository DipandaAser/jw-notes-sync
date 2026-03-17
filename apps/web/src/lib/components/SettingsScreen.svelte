<script lang="ts">
	import { Mail, Github, Globe } from 'lucide-svelte';
	import { t, getLocale, setLocale, type SupportedLocale } from '$lib/i18n.svelte';

	function toggleLanguage() {
		const current = getLocale();
		const next = current === 'fr' ? 'en' : 'fr';
		setLocale(next);
	}

	const languageLabels: Record<SupportedLocale, string> = {
		fr: 'Français',
		en: 'English',
	};
</script>

<h1 class="mb-6 text-2xl font-bold">{t('settings.title')}</h1>

<div class="flex max-w-lg flex-col gap-3">
	<button
		class="flex items-center gap-3 rounded-xl border p-4 text-left transition-all"
		style="background: var(--surface-1); border-color: var(--border);"
		onclick={toggleLanguage}
	>
		<Globe size={22} style="color: var(--accent);" />
		<div class="flex-1">
			<div class="font-semibold" style="color: var(--text-primary);">{t('settings.language')}</div>
			<div class="mt-0.5 text-sm" style="color: var(--text-tertiary);">{languageLabels[getLocale()]}</div>
		</div>
	</button>

	<a
		href="mailto:aserdipanda@gmail.com?subject=JW Notes Sync - Feedback"
		class="flex items-center gap-3 rounded-xl border p-4 transition-all"
		style="background: var(--surface-1); border-color: var(--border);"
	>
		<Mail size={22} style="color: var(--accent);" />
		<div>
			<div class="font-semibold" style="color: var(--text-primary);">{t('settings.feedback')}</div>
			<div class="mt-0.5 text-sm" style="color: var(--text-tertiary);">aserdipanda@gmail.com</div>
		</div>
	</a>

	<a
		href="https://github.com/DipandaAser/jw-notes-sync"
		target="_blank"
		rel="noopener"
		class="flex items-center gap-3 rounded-xl border p-4 transition-all"
		style="background: var(--surface-1); border-color: var(--border);"
	>
		<Github size={22} style="color: var(--accent);" />
		<div>
			<div class="font-semibold" style="color: var(--text-primary);">{t('settings.source')}</div>
			<div class="mt-0.5 text-sm" style="color: var(--text-tertiary);">{t('settings.sourceLabel')}</div>
		</div>
	</a>
</div>
