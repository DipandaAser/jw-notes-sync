<script lang="ts">
	import type { DatabaseContents } from '@jw-notes-sync/core';
	import { t, getLocale } from '$lib/i18n.svelte';

	interface Props {
		data: DatabaseContents;
	}

	let { data }: Props = $props();

	function fmt(n: number): string {
		return n.toLocaleString(getLocale());
	}

	const stats = $derived([
		{ value: data.notes.length, label: t('stats.notes'), color: 'var(--stat-1)' },
		{ value: data.userMarks.length, label: t('stats.highlights'), color: 'var(--stat-2)' },
		{ value: data.bookmarks.length, label: t('stats.bookmarks'), color: 'var(--stat-3)' },
		{ value: data.tags.length, label: t('stats.tags'), color: 'var(--stat-4)' },
		{ value: data.locations.length, label: t('stats.locations'), color: 'var(--accent)' },
		{ value: data.playlistItems.length, label: t('explorer.stats.playlists'), color: 'var(--warm)' },
		{ value: data.inputFields.length, label: t('explorer.stats.inputFields'), color: 'var(--success)' },
		{ value: data.independentMedia.length, label: t('explorer.stats.media'), color: 'var(--text-tertiary)' },
	]);
</script>

<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
	{#each stats as stat}
		<div
			class="rounded-xl border p-5 text-center transition-all"
			style="background: var(--surface-1); border-color: var(--border);"
		>
			<div class="text-3xl font-bold tabular-nums" style="color: {stat.color};">
				{fmt(stat.value)}
			</div>
			<div class="mt-1 text-xs font-medium" style="color: var(--text-secondary);">
				{stat.label}
			</div>
		</div>
	{/each}
</div>
