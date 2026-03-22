<script lang="ts">
	import type { Location } from '@jw-notes-sync/core';
	import { ArrowLeft } from 'lucide-svelte';
	import { appState } from '$lib/stores/app.svelte';
	import { t } from '$lib/i18n.svelte';
	import { buildLocationMap } from '$lib/explorer';
	import ExplorerStats from './ExplorerStats.svelte';
	import ExplorerNotes from './ExplorerNotes.svelte';
	import ExplorerHighlights from './ExplorerHighlights.svelte';
	import ExplorerBookmarks from './ExplorerBookmarks.svelte';
	import ExplorerTags from './ExplorerTags.svelte';
	import ExplorerPlaylists from './ExplorerPlaylists.svelte';

	type ExplorerTab = 'stats' | 'notes' | 'highlights' | 'bookmarks' | 'tags' | 'playlists';

	let activeTab = $state<ExplorerTab>('stats');

	const data = $derived(appState.explorerData);
	const locationMap = $derived<Map<number, Location>>(
		data ? buildLocationMap(data.locations) : new Map(),
	);

	const tabs: { id: ExplorerTab; labelKey: string }[] = [
		{ id: 'stats', labelKey: 'explorer.tab.stats' },
		{ id: 'notes', labelKey: 'explorer.tab.notes' },
		{ id: 'highlights', labelKey: 'explorer.tab.highlights' },
		{ id: 'bookmarks', labelKey: 'explorer.tab.bookmarks' },
		{ id: 'tags', labelKey: 'explorer.tab.tags' },
		{ id: 'playlists', labelKey: 'explorer.tab.playlists' },
	];
</script>

{#if !data}
	<p class="py-16 text-center" style="color: var(--text-secondary);">No data to explore.</p>
{:else}
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<button
			class="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-all"
			style="background: var(--surface-2); color: var(--text-secondary);"
			onclick={() => appState.closeExplorer()}
			aria-label={t('explorer.back')}
		>
			<ArrowLeft size={18} />
		</button>
		<div>
			<h1 class="text-xl font-bold">{t('explorer.title')}</h1>
			<p class="text-sm" style="color: var(--text-tertiary);">{appState.explorerLabel}</p>
		</div>
	</div>

	<!-- Sub-nav tabs -->
	<div class="mb-6 flex flex-wrap gap-2">
		{#each tabs as tab}
			<button
				class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
				style="background: {activeTab === tab.id ? 'var(--accent)' : 'var(--surface-2)'}; color: {activeTab === tab.id ? 'var(--accent-text)' : 'var(--text-secondary)'};"
				onclick={() => (activeTab = tab.id)}
			>
				{t(tab.labelKey)}
			</button>
		{/each}
	</div>

	<!-- Active view -->
	{#if activeTab === 'stats'}
		<ExplorerStats {data} />
	{:else if activeTab === 'notes'}
		<ExplorerNotes {data} {locationMap} />
	{:else if activeTab === 'highlights'}
		<ExplorerHighlights {data} {locationMap} />
	{:else if activeTab === 'bookmarks'}
		<ExplorerBookmarks {data} {locationMap} />
	{:else if activeTab === 'tags'}
		<ExplorerTags {data} />
	{:else if activeTab === 'playlists'}
		<ExplorerPlaylists {data} />
	{/if}
{/if}
