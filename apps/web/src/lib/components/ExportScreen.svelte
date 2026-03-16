<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { downloadArchive } from '$lib/merge';

	const result = $derived(appState.mergeResult);

	function formatNumber(n: number): string {
		return n.toLocaleString('fr-FR');
	}

	function startOver() {
		appState.reset();
	}
</script>

{#if !result}
	<div class="py-16 text-center">
		<p style="color: var(--text-secondary);">Aucune fusion disponible.</p>
		<button
			class="mt-4 rounded-lg px-6 py-3 font-semibold transition-all"
			style="background: var(--accent); color: var(--accent-text);"
			onclick={() => appState.goTo('import')}
		>
			← Retour à l'import
		</button>
	</div>
{:else}
	<!-- Success hero -->
	<div class="mb-10 text-center">
		<div
			class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-2xl font-bold text-white"
			style="background: var(--accent);"
		>
			✓
		</div>
		<h1 class="mb-2 text-3xl font-bold tracking-tight">Fusion terminée</h1>
		<p class="text-base" style="color: var(--text-secondary);">
			Vos {appState.backups.length} sauvegardes ont été fusionnées avec succès.
		</p>
	</div>

	<!-- Stats grid -->
	<div class="mx-auto mb-10 grid max-w-2xl grid-cols-3 gap-4">
		{#each [
			{ value: result.stats.notes, label: 'Notes' },
			{ value: result.stats.highlights, label: 'Surlignages' },
			{ value: result.stats.bookmarks, label: 'Signets' },
			{ value: result.stats.tags, label: 'Étiquettes' },
			{ value: result.stats.locations, label: 'Locations' },
			{ value: result.stats.inputFields, label: 'Formulaires' },
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
			Sources fusionnées
		</h2>
		<div class="flex flex-col gap-2">
			{#each appState.backups as backup}
				<div
					class="flex items-center gap-3 rounded-lg border px-4 py-3"
					style="background: var(--surface-1); border-color: var(--border);"
				>
					<span class="text-lg">📱</span>
					<span class="font-medium">{backup.deviceName}</span>
					<span class="text-xs" style="color: var(--text-tertiary);">{backup.fileName}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Download -->
	<div class="text-center">
		<button
			class="rounded-xl px-8 py-4 text-base font-semibold tracking-tight transition-all hover:-translate-y-0.5"
			style="background: var(--accent); color: var(--accent-text);"
			onclick={downloadArchive}
		>
			Télécharger le fichier fusionné
		</button>
		<div class="mt-4">
			<button
				class="text-sm font-medium transition-all"
				style="color: var(--text-tertiary);"
				onclick={startOver}
			>
				Recommencer une nouvelle fusion
			</button>
		</div>
	</div>
{/if}
