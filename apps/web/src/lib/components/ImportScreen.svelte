<script lang="ts">
	import { parseJWLibrary } from '@jw-notes-sync/core';
	import { webAdapter } from '$lib/adapter';
	import { appState, type ImportedBackup } from '$lib/stores/app.svelte';

	let dragging = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleFiles(files: FileList | null) {
		if (!files) return;
		error = null;
		loading = true;

		try {
			for (const file of files) {
				if (!file.name.endsWith('.jwlibrary')) {
					error = `"${file.name}" n'est pas un fichier .jwlibrary`;
					continue;
				}

				const bytes = new Uint8Array(await file.arrayBuffer());
				const archive = await parseJWLibrary(webAdapter, bytes);
				const db = archive.database;

				const backup: ImportedBackup = {
					id: crypto.randomUUID(),
					fileName: file.name,
					deviceName: archive.manifest.userDataBackup.deviceName,
					date: archive.manifest.creationDate,
					archive,
					stats: {
						notes: db.notes.length,
						highlights: db.userMarks.length,
						bookmarks: db.bookmarks.length,
						tags: db.tags.length,
					},
				};

				appState.addBackup(backup);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur lors de l\'importation';
		} finally {
			loading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		handleFiles(e.dataTransfer?.files ?? null);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function onFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		handleFiles(input.files);
		input.value = '';
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			});
		} catch {
			return iso;
		}
	}

	function goToMerge() {
		appState.goTo('merge');
	}
</script>

<!-- Hero -->
<div class="mb-12">
	<h1
		class="mb-4 max-w-[18ch] text-4xl font-bold leading-tight tracking-tight"
		style="font-size: clamp(2.1rem, 1.7rem + 2vw, 3.052rem);"
	>
		Fusionnez vos notes <em class="not-italic" style="color: var(--accent);">sans rien perdre</em>
	</h1>
	<p class="max-w-[52ch] text-lg leading-relaxed" style="color: var(--text-secondary);">
		Importez vos sauvegardes JW Library depuis différents appareils et combinez-les en un seul
		fichier complet.
	</p>
</div>

<!-- Dropzone -->
<label
	class="relative mb-8 block cursor-pointer overflow-hidden rounded-xl border-2 border-dashed py-12 text-center transition-all"
	style="border-color: {dragging
		? 'var(--accent)'
		: 'var(--border-strong)'}; background: {dragging ? 'var(--accent-subtle)' : 'transparent'};"
	ondrop={onDrop}
	ondragover={onDragOver}
	ondragleave={() => (dragging = false)}
>
	<input
		type="file"
		accept=".jwlibrary"
		multiple
		class="hidden"
		onchange={onFileInput}
		disabled={loading}
	/>
	<div class="text-4xl">{loading ? '⏳' : '📁'}</div>
	<div class="mt-4 text-lg font-semibold" style="color: var(--text-primary);">
		{loading ? 'Importation en cours…' : 'Glissez vos fichiers .jwlibrary ici'}
	</div>
	<div class="mt-2 text-sm" style="color: var(--text-tertiary);">
		ou <span class="font-semibold underline underline-offset-2" style="color: var(--accent);"
			>parcourez vos fichiers</span
		>
	</div>
</label>

<!-- Error -->
{#if error}
	<div
		class="mb-6 rounded-lg px-4 py-3 text-sm font-medium"
		style="background: var(--danger-subtle); color: var(--danger);"
	>
		{error}
	</div>
{/if}

<!-- Backup list -->
{#if appState.backups.length > 0}
	<div class="mb-4 flex items-baseline justify-between">
		<h2 class="text-xl font-bold">Sauvegardes importées</h2>
		<span class="text-sm font-medium" style="color: var(--text-tertiary);">
			{appState.backups.length} fichier{appState.backups.length > 1 ? 's' : ''}
		</span>
	</div>

	<div class="mb-8 flex flex-col gap-3">
		{#each appState.backups as backup (backup.id)}
			<div
				class="grid items-center gap-4 rounded-xl border border-l-4 px-6 py-4 transition-all"
				style="grid-template-columns: auto 1fr auto auto; background: var(--surface-1); border-color: var(--border); border-left-color: var(--accent);"
			>
				<div
					class="grid h-11 w-11 place-items-center rounded text-xl"
					style="background: var(--surface-2);"
				>
					📱
				</div>
				<div>
					<h3 class="font-semibold">{backup.deviceName}</h3>
					<div class="mt-0.5 text-xs" style="color: var(--text-tertiary);">
						{formatDate(backup.date)} · {backup.fileName}
					</div>
				</div>
				<div class="hidden gap-4 sm:flex">
					<div class="text-right">
						<div class="text-lg font-bold tabular-nums">{backup.stats.notes}</div>
						<div
							class="text-xs font-medium uppercase tracking-wider"
							style="color: var(--text-tertiary);"
						>
							Notes
						</div>
					</div>
					<div class="text-right">
						<div class="text-lg font-bold tabular-nums">{backup.stats.highlights}</div>
						<div
							class="text-xs font-medium uppercase tracking-wider"
							style="color: var(--text-tertiary);"
						>
							Surlignages
						</div>
					</div>
					<div class="text-right">
						<div class="text-lg font-bold tabular-nums">{backup.stats.bookmarks}</div>
						<div
							class="text-xs font-medium uppercase tracking-wider"
							style="color: var(--text-tertiary);"
						>
							Signets
						</div>
					</div>
				</div>
				<button
					class="grid h-8 w-8 place-items-center rounded text-lg transition-all hover:opacity-70"
					style="color: var(--text-tertiary);"
					onclick={() => appState.removeBackup(backup.id)}
					aria-label="Supprimer"
				>
					✕
				</button>
			</div>
		{/each}
	</div>

	<!-- Merge button -->
	{#if appState.canMerge()}
		<div class="text-center">
			<button
				class="rounded-xl px-8 py-4 text-base font-semibold tracking-tight transition-all hover:-translate-y-0.5"
				style="background: var(--accent); color: var(--accent-text);"
				onclick={goToMerge}
			>
				Fusionner {appState.backups.length} sauvegardes →
			</button>
		</div>
	{:else}
		<p class="text-center text-sm" style="color: var(--text-tertiary);">
			Importez au moins 2 sauvegardes pour fusionner.
		</p>
	{/if}
{/if}
