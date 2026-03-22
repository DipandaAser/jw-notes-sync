<script lang="ts">
	import type { DatabaseContents } from '@jw-notes-sync/core';
	import { ChevronDown, ChevronRight, Music } from 'lucide-svelte';
	import { t } from '$lib/i18n.svelte';

	interface Props {
		data: DatabaseContents;
	}

	let { data }: Props = $props();

	let expandedItems = $state<Set<number>>(new Set());

	function toggleItem(id: number) {
		const next = new Set(expandedItems);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedItems = next;
	}

	function ticksToTime(ticks: number): string {
		const totalSeconds = Math.floor(ticks / 10_000_000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	const markersByItemId = $derived.by(() => {
		const map = new Map<number, typeof data.playlistItemMarkers>();
		for (const m of data.playlistItemMarkers) {
			const existing = map.get(m.PlaylistItemId);
			if (existing) existing.push(m);
			else map.set(m.PlaylistItemId, [m]);
		}
		return map;
	});
</script>

{#if data.playlistItems.length === 0}
	<p class="py-12 text-center text-sm" style="color: var(--text-tertiary);">
		{t('explorer.playlists.empty')}
	</p>
{:else}
	<div class="flex flex-col gap-1">
		{#each data.playlistItems as item}
			{@const markers = markersByItemId.get(item.PlaylistItemId) ?? []}
			<div>
				<button
					class="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
					style="background: {expandedItems.has(item.PlaylistItemId) ? 'var(--surface-2)' : 'var(--surface-1)'};"
					onclick={() => toggleItem(item.PlaylistItemId)}
				>
					{#if expandedItems.has(item.PlaylistItemId)}
						<ChevronDown size={16} style="color: var(--text-tertiary);" />
					{:else}
						<ChevronRight size={16} style="color: var(--text-tertiary);" />
					{/if}
					<Music size={16} style="color: var(--warm);" />
					<span class="flex-1 font-medium" style="color: var(--text-primary);">
						{item.Label}
					</span>
					{#if markers.length > 0}
						<span class="text-xs font-medium" style="color: var(--text-tertiary);">
							{t('explorer.playlists.markers', { count: markers.length })}
						</span>
					{/if}
				</button>

				{#if expandedItems.has(item.PlaylistItemId) && markers.length > 0}
					<div class="ml-10 mt-1 mb-2 flex flex-col gap-1">
						{#each markers as marker}
							<div
								class="flex items-center gap-3 rounded-md px-3 py-2 text-xs"
								style="background: var(--surface-1); color: var(--text-secondary);"
							>
								<span class="font-mono tabular-nums" style="color: var(--text-tertiary);">
									{ticksToTime(marker.StartTimeTicks)}
								</span>
								<span>{marker.Label}</span>
								<span class="ml-auto" style="color: var(--text-tertiary);">
									{ticksToTime(marker.DurationTicks)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
