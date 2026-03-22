<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { downloadArchive } from '$lib/merge';
	import { Check, Smartphone, Download, Eye } from 'lucide-svelte';
	import { t, getLocale } from '$lib/i18n.svelte';

	const result = $derived(appState.mergeResult);

	function formatNumber(n: number): string {
		return n.toLocaleString(getLocale());
	}

	function startOver() {
		appState.reset();
	}
</script>

{#if !result}
	<div class="py-16 text-center">
		<p style="color: var(--text-secondary);">{t('export.noResultFull')}</p>
		<button
			class="mt-4 rounded-lg px-6 py-3 font-semibold transition-all"
			style="background: var(--accent); color: var(--accent-text);"
			onclick={() => appState.goTo('import')}
		>
			{t('merge.back')}
		</button>
	</div>
{:else}
	<!-- Success hero -->
	<div class="mb-10 text-center">
		<div
			class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-2xl font-bold text-white"
			style="background: var(--accent);"
		>
			<Check size={28} />
		</div>
		<h1 class="mb-2 text-3xl font-bold tracking-tight">{t('export.successFull')}</h1>
		<p class="text-base" style="color: var(--text-secondary);">
			{t('export.subtitleFull', { count: appState.backups.length })}
		</p>
	</div>

	<!-- Stats grid -->
	<div class="mx-auto mb-10 grid max-w-2xl grid-cols-3 gap-4">
		{#each [
			{ value: result.stats.notes, label: t('stats.notes') },
			{ value: result.stats.highlights, label: t('stats.highlights') },
			{ value: result.stats.bookmarks, label: t('stats.bookmarks') },
			{ value: result.stats.tags, label: t('stats.tags') },
			{ value: result.stats.locations, label: t('stats.locationsFull') },
			{ value: result.stats.inputFields, label: t('stats.inputFields') },
		] as stat}
			<div class="rounded-lg border p-4 text-center" style="background: var(--surface-1); border-color: var(--border);">
				<div class="text-2xl font-bold tabular-nums">{formatNumber(stat.value)}</div>
				<div class="mt-1 text-xs" style="color: var(--text-secondary);">{stat.label}</div>
			</div>
		{/each}
	</div>

	<!-- Source devices -->
	<div class="mx-auto mb-10 max-w-2xl">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">
			{t('export.sources')}
		</h2>
		<div class="flex flex-col gap-2">
			{#each appState.backups as backup}
				<div
					class="flex items-center gap-3 rounded-lg border px-4 py-3"
					style="background: var(--surface-1); border-color: var(--border);"
				>
					<Smartphone size={18} style="color: var(--text-tertiary);" />
					<span class="font-medium">{backup.deviceName}</span>
					<span class="text-xs" style="color: var(--text-tertiary);">{backup.fileName}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Actions -->
	<div class="text-center">
		<button
			class="rounded-xl px-8 py-4 text-base font-semibold tracking-tight transition-all hover:-translate-y-0.5"
			style="background: var(--accent); color: var(--accent-text);"
			onclick={downloadArchive}
		>
			{t('export.download')}
		</button>
		<div class="mt-4 flex justify-center gap-4">
			<button
				class="flex items-center gap-2 text-sm font-medium transition-all"
				style="color: var(--accent);"
				onclick={() => appState.openExplorer(result.contents, t('explorer.mergedData'))}
			>
				<Eye size={16} />
				{t('explorer.exploreResult')}
			</button>
			<button
				class="text-sm font-medium transition-all"
				style="color: var(--text-tertiary);"
				onclick={startOver}
			>
				{t('export.newMergeFull')}
			</button>
		</div>
	</div>
{/if}
