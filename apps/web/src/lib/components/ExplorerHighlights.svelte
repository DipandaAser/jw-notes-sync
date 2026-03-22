<script lang="ts">
	import type { DatabaseContents, Location } from '@jw-notes-sync/core';
	import { t } from '$lib/i18n.svelte';
	import { buildHighlights, HIGHLIGHT_COLORS, getLocationLabel } from '$lib/explorer';

	interface Props {
		data: DatabaseContents;
		locationMap: Map<number, Location>;
	}

	let { data, locationMap }: Props = $props();

	let colorFilter = $state<number | null>(null);

	const allHighlights = $derived(
		buildHighlights(data.userMarks, data.blockRanges, locationMap),
	);

	const filtered = $derived(
		colorFilter != null
			? allHighlights.filter((h) => h.mark.ColorIndex === colorFilter)
			: allHighlights,
	);

	const colorCounts = $derived.by(() => {
		const counts = new Map<number, number>();
		for (const h of allHighlights) {
			counts.set(h.mark.ColorIndex, (counts.get(h.mark.ColorIndex) ?? 0) + 1);
		}
		return counts;
	});
</script>

<!-- Color filter pills -->
<div class="mb-6 flex flex-wrap gap-2">
	<button
		class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
		style="background: {colorFilter == null ? 'var(--accent)' : 'var(--surface-2)'}; color: {colorFilter == null ? 'var(--accent-text)' : 'var(--text-secondary)'};"
		onclick={() => (colorFilter = null)}
	>
		{t('explorer.highlights.all')} ({allHighlights.length})
	</button>
	{#each Object.entries(HIGHLIGHT_COLORS) as [idx, color]}
		{@const index = Number(idx)}
		{@const count = colorCounts.get(index) ?? 0}
		{#if count > 0}
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
				style="background: {colorFilter === index ? color.bg : 'var(--surface-2)'}; color: {colorFilter === index ? color.fg : 'var(--text-secondary)'};"
				onclick={() => (colorFilter = colorFilter === index ? null : index)}
			>
				<span
					class="inline-block h-3 w-3 rounded-full"
					style="background: {color.bg}; border: 2px solid {color.fg};"
				></span>
				{count}
			</button>
		{/if}
	{/each}
</div>

{#if filtered.length === 0}
	<p class="py-12 text-center text-sm" style="color: var(--text-tertiary);">
		{t('explorer.highlights.empty')}
	</p>
{:else}
	<div class="flex flex-col gap-2">
		{#each filtered as highlight}
			{@const color = HIGHLIGHT_COLORS[highlight.mark.ColorIndex] ?? HIGHLIGHT_COLORS[1]}
			<div
				class="flex items-start gap-3 rounded-lg border px-4 py-3"
				style="background: var(--surface-1); border-color: var(--border);"
			>
				<span
					class="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
					style="background: {color.bg}; border: 2px solid {color.fg};"
				></span>
				<div class="min-w-0 flex-1">
					<div class="text-sm font-medium" style="color: var(--text-primary);">
						{getLocationLabel(highlight.location) || t('explorer.group.unknown')}
					</div>
					{#if highlight.blockRanges.length > 0}
						<div class="mt-1 flex flex-wrap gap-2">
							{#each highlight.blockRanges as br}
								<span
									class="inline-block rounded px-2 py-0.5 text-xs"
									style="background: color-mix(in srgb, {color.bg} 40%, transparent); color: {color.fg};"
								>
									{t('explorer.highlights.paragraph', { id: br.Identifier })}
									{#if br.StartToken != null && br.EndToken != null}
										· {t('explorer.highlights.tokens', { start: br.StartToken, end: br.EndToken })}
									{/if}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
