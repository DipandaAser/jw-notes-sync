<script lang="ts">
	import type { DatabaseContents, Location } from '@jw-notes-sync/core';
	import { t } from '$lib/i18n.svelte';
	import { groupByLocation } from '$lib/explorer';

	interface Props {
		data: DatabaseContents;
		locationMap: Map<number, Location>;
	}

	let { data, locationMap }: Props = $props();

	const groups = $derived(
		groupByLocation(data.bookmarks, (b) => b.PublicationLocationId, locationMap),
	);
</script>

{#if data.bookmarks.length === 0}
	<p class="py-12 text-center text-sm" style="color: var(--text-tertiary);">
		{t('explorer.bookmarks.empty')}
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
					{#each group.items as bookmark}
						<div
							class="rounded-lg border px-4 py-3"
							style="background: var(--surface-1); border-color: var(--border);"
						>
							<div class="font-semibold" style="color: var(--text-primary);">
								{bookmark.Title}
							</div>
							{#if bookmark.Snippet}
								<div class="mt-1 text-sm leading-relaxed" style="color: var(--text-secondary);">
									{bookmark.Snippet}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
