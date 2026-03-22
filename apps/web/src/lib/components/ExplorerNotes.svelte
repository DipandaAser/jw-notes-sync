<script lang="ts">
	import type { DatabaseContents, Location } from '@jw-notes-sync/core';
	import { Search } from 'lucide-svelte';
	import { t, getLocale } from '$lib/i18n.svelte';
	import { searchNotes, groupByLocation } from '$lib/explorer';

	interface Props {
		data: DatabaseContents;
		locationMap: Map<number, Location>;
	}

	let { data, locationMap }: Props = $props();

	let query = $state('');

	const filtered = $derived(searchNotes(data.notes, query));
	const groups = $derived(
		groupByLocation(filtered, (n) => n.LocationId, locationMap),
	);

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(getLocale(), {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			});
		} catch {
			return iso;
		}
	}

	function truncate(text: string, max: number): string {
		if (text.length <= max) return text;
		return text.slice(0, max) + '…';
	}
</script>

<!-- Search -->
<div class="relative mb-6">
	<Search
		size={18}
		class="absolute left-3 top-1/2 -translate-y-1/2"
		style="color: var(--text-tertiary);"
	/>
	<input
		type="text"
		placeholder={t('explorer.notes.search')}
		bind:value={query}
		class="w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2"
		style="background: var(--surface-1); border-color: var(--border); color: var(--text-primary); --tw-ring-color: var(--accent);"
	/>
</div>

{#if filtered.length === 0}
	<p class="py-12 text-center text-sm" style="color: var(--text-tertiary);">
		{t('explorer.notes.empty')}
	</p>
{:else}
	<div class="flex flex-col gap-6">
		{#each groups as group}
			<div>
				<h3
					class="mb-3 text-xs font-semibold uppercase tracking-wider"
					style="color: var(--text-tertiary);"
				>
					{group.label || t('explorer.group.unknown')}
					<span class="ml-1 font-normal">({group.items.length})</span>
				</h3>
				<div class="flex flex-col gap-2">
					{#each group.items as note}
						<div
							class="rounded-lg border px-4 py-3"
							style="background: var(--surface-1); border-color: var(--border);"
						>
							{#if note.Title}
								<div class="mb-1 font-semibold" style="color: var(--text-primary);">
									{note.Title}
								</div>
							{/if}
							<div class="text-sm leading-relaxed" style="color: var(--text-secondary);">
								{note.Content ? truncate(note.Content, 150) : t('explorer.notes.noContent')}
							</div>
							<div class="mt-2 text-xs" style="color: var(--text-tertiary);">
								{formatDate(note.LastModified)}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
