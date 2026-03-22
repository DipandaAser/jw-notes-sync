<script lang="ts">
	import type { DatabaseContents } from '@jw-notes-sync/core';
	import { ChevronDown, ChevronRight, Tag as TagIcon } from 'lucide-svelte';
	import { t } from '$lib/i18n.svelte';

	interface Props {
		data: DatabaseContents;
	}

	let { data }: Props = $props();

	let expandedTags = $state<Set<number>>(new Set());

	interface TagWithCounts {
		tag: typeof data.tags[number];
		noteCount: number;
		locationCount: number;
		playlistCount: number;
		total: number;
	}

	const tagsWithCounts = $derived.by<TagWithCounts[]>(() => {
		const tagMapsByTagId = new Map<number, typeof data.tagMaps>();
		for (const tm of data.tagMaps) {
			const existing = tagMapsByTagId.get(tm.TagId);
			if (existing) existing.push(tm);
			else tagMapsByTagId.set(tm.TagId, [tm]);
		}

		return data.tags
			.map((tag) => {
				const maps = tagMapsByTagId.get(tag.TagId) ?? [];
				return {
					tag,
					noteCount: maps.filter((m) => m.NoteId != null).length,
					locationCount: maps.filter((m) => m.LocationId != null).length,
					playlistCount: maps.filter((m) => m.PlaylistItemId != null).length,
					total: maps.length,
				};
			})
			.sort((a, b) => a.tag.Name.localeCompare(b.tag.Name));
	});

	function toggleTag(tagId: number) {
		const next = new Set(expandedTags);
		if (next.has(tagId)) next.delete(tagId);
		else next.add(tagId);
		expandedTags = next;
	}

	const notesByIdMap = $derived.by(() => {
		const map = new Map<number, typeof data.notes[number]>();
		for (const n of data.notes) map.set(n.NoteId, n);
		return map;
	});
</script>

{#if data.tags.length === 0}
	<p class="py-12 text-center text-sm" style="color: var(--text-tertiary);">
		{t('explorer.tags.empty')}
	</p>
{:else}
	<div class="flex flex-col gap-1">
		{#each tagsWithCounts as { tag, noteCount, locationCount, playlistCount, total }}
			<div>
				<button
					class="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
					style="background: {expandedTags.has(tag.TagId) ? 'var(--surface-2)' : 'var(--surface-1)'};"
					onclick={() => toggleTag(tag.TagId)}
				>
					{#if expandedTags.has(tag.TagId)}
						<ChevronDown size={16} style="color: var(--text-tertiary);" />
					{:else}
						<ChevronRight size={16} style="color: var(--text-tertiary);" />
					{/if}
					<TagIcon size={16} style="color: var(--accent);" />
					<span class="flex-1 font-medium" style="color: var(--text-primary);">{tag.Name}</span>
					<span class="text-xs font-medium" style="color: var(--text-tertiary);">
						{t('explorer.tags.items', { count: total })}
					</span>
				</button>

				{#if expandedTags.has(tag.TagId)}
					<div class="ml-10 mt-1 mb-2 flex flex-col gap-1">
						{#each data.tagMaps.filter((tm) => tm.TagId === tag.TagId) as tm}
							<div
								class="rounded-md px-3 py-2 text-xs"
								style="background: var(--surface-1); color: var(--text-secondary);"
							>
								{#if tm.NoteId != null}
									{@const note = notesByIdMap.get(tm.NoteId)}
									Note: {note?.Title ?? note?.Content?.slice(0, 60) ?? `#${tm.NoteId}`}
								{:else if tm.LocationId != null}
									Location #{tm.LocationId}
								{:else if tm.PlaylistItemId != null}
									Playlist item #{tm.PlaylistItemId}
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
