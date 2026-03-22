<script lang="ts">
	import { Mail, Github, Globe, History, Trash2, Smartphone, RotateCcw, HardDrive } from 'lucide-svelte';
	import { t, getLocale, setLocale, type SupportedLocale } from '$lib/i18n.svelte';
	import { appState } from '$lib/stores/app.svelte';
	import { formatBytes } from '$lib/format';
	import HelpScreen from './HelpScreen.svelte';

	function toggleLanguage() {
		const current = getLocale();
		const next = current === 'fr' ? 'en' : 'fr';
		setLocale(next);
	}

	const languageLabels: Record<SupportedLocale, string> = {
		fr: 'Français',
		en: 'English',
	};

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(getLocale(), {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return iso;
		}
	}

	const storagePercent = $derived(
		appState.storageQuota > 0
			? Math.min(100, Math.round((appState.storageUsed / appState.storageQuota) * 100))
			: 0,
	);
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

	<button
		class="flex items-center gap-3 rounded-xl border p-4 text-left transition-all"
		style="background: var(--surface-1); border-color: var(--border);"
		onclick={() => appState.resetOnboarding()}
	>
		<RotateCcw size={22} style="color: var(--accent);" />
		<div class="font-semibold" style="color: var(--text-primary);">{t('settings.replayTutorial')}</div>
	</button>
</div>

<!-- FAQ -->
<div class="mt-10 max-w-lg">
	<HelpScreen />
</div>

<!-- Storage -->
<div class="mt-10 max-w-lg">
	<h2 class="mb-3 flex items-center gap-2 text-lg font-bold">
		<HardDrive size={20} style="color: var(--accent);" />
		{t('storage.title')}
	</h2>

	{#if appState.storageQuota > 0}
		<div class="mb-3 rounded-lg border p-4" style="background: var(--surface-1); border-color: var(--border);">
			<div class="mb-2 flex items-baseline justify-between">
				<span class="text-sm" style="color: var(--text-secondary);">
					{t('storage.used', { used: formatBytes(appState.storageUsed), quota: formatBytes(appState.storageQuota) })}
				</span>
				<span class="text-xs tabular-nums" style="color: var(--text-tertiary);">{storagePercent}%</span>
			</div>
			<div class="h-2 overflow-hidden rounded-full" style="background: var(--surface-2);">
				<div
					class="h-full rounded-full transition-all"
					style="width: {storagePercent}%; background: {storagePercent > 80 ? 'var(--danger)' : 'var(--accent)'};"
				></div>
			</div>
		</div>
	{/if}

	{#if appState.recentFiles.length > 0}
		<div class="mb-2 text-xs" style="color: var(--text-tertiary);">
			{t('storage.count', { count: appState.recentFiles.length })}
		</div>
		<button
			class="flex items-center gap-1 text-xs font-medium transition-all"
			style="color: var(--danger);"
			onclick={() => appState.clearStorage()}
		>
			<Trash2 size={14} />
			{t('storage.clear')}
		</button>
	{:else}
		<p class="text-sm" style="color: var(--text-tertiary);">{t('storage.empty')}</p>
	{/if}
</div>

<!-- Merge history -->
{#if appState.mergeHistory.length > 0}
	<div class="mt-10 max-w-lg">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-bold">
				<History size={20} style="color: var(--accent);" />
				{t('history.title')}
			</h2>
			<button
				class="flex items-center gap-1 text-xs font-medium transition-all"
				style="color: var(--danger);"
				onclick={() => appState.clearMergeHistory()}
			>
				<Trash2 size={14} />
				{t('history.clear')}
			</button>
		</div>
		<div class="flex flex-col gap-2">
			{#each appState.mergeHistory as entry}
				<div
					class="rounded-lg border px-4 py-3"
					style="background: var(--surface-1); border-color: var(--border);"
				>
					<div class="mb-1 flex items-center justify-between">
						<span class="text-sm font-medium">{formatDate(entry.date)}</span>
						{#if entry.dryRun}
							<span
								class="rounded px-1.5 py-0.5 text-xs font-semibold"
								style="background: var(--accent-subtle, var(--surface-2)); color: var(--accent);"
							>
								{t('config.dryRun.badge')}
							</span>
						{/if}
					</div>
					<div class="flex flex-wrap gap-1 text-xs" style="color: var(--text-tertiary);">
						{#each entry.sources as source}
							<span class="flex items-center gap-1">
								<Smartphone size={12} />
								{source.deviceName}
							</span>
						{/each}
					</div>
					<div class="mt-1 text-xs" style="color: var(--text-secondary);">
						{entry.stats.notes} notes · {entry.stats.highlights} highlights · {entry.stats.bookmarks} bookmarks
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
