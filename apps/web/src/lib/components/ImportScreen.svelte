<script lang="ts">
	import { parseJWLibrary } from '@jw-notes-sync/core';
	import { webAdapter } from '$lib/adapter';
	import { appState, type ImportedBackup } from '$lib/stores/app.svelte';
	import { Upload, X, Loader, Eye, FlaskConical, RotateCcw } from 'lucide-svelte';
	import { t, getLocale } from '$lib/i18n.svelte';
	import { formatBytes } from '$lib/format';

	let dragging = $state(false);
	let loading = $state(false);
	let loadingSamples = $state(false);
	let restoringId = $state<string | null>(null);
	let error = $state<string | null>(null);

	// Recent files not already loaded
	const availableRecent = $derived(
		appState.recentFiles.filter(
			(meta) => !appState.backups.some((b) => b.id === meta.id),
		),
	);

	async function restoreRecent(id: string) {
		restoringId = id;
		error = null;
		try {
			const ok = await appState.restoreBackup(
				appState.recentFiles.find((m) => m.id === id)!,
			);
			if (!ok) error = t('import.error.generic');
		} catch (err) {
			error = err instanceof Error ? err.message : t('import.error.generic');
		} finally {
			restoringId = null;
		}
	}


	async function handleFiles(files: FileList | null) {
		if (!files) return;
		error = null;
		loading = true;

		try {
			for (const file of files) {
				if (!file.name.endsWith('.jwlibrary')) {
					error = t('import.error.notJwlibrary', { name: file.name });
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

				appState.addBackup(backup, bytes);

				// In library mode with a source of truth, auto-merge the first new file
				if (appState.mergeMode === 'library' && appState.sourceOfTruth) {
					loading = false;
					await appState.startLibraryMerge(backup);
					return;
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : t('import.error.generic');
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
			return new Date(iso).toLocaleDateString(getLocale(), {
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

	async function loadSampleData() {
		if (loadingSamples) return;
		loadingSamples = true;
		error = null;

		try {
			const base = import.meta.env.BASE_URL;
			const [resA, resB] = await Promise.all([
				fetch(`${base}samples/sample-device-a.jwlibrary`),
				fetch(`${base}samples/sample-device-b.jwlibrary`),
			]);

			for (const res of [resA, resB]) {
				if (!res.ok) throw new Error(`Failed to load sample: ${res.status}`);
				const bytes = new Uint8Array(await res.arrayBuffer());
				const archive = await parseJWLibrary(webAdapter, bytes);
				const db = archive.database;

				const backup: ImportedBackup = {
					id: crypto.randomUUID(),
					fileName: res.url.split('/').pop() ?? 'sample.jwlibrary',
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

				appState.addBackup(backup, bytes);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : t('import.error.generic');
		} finally {
			loadingSamples = false;
		}
	}
</script>

<!-- Hero -->
<div class="mb-12">
	<h1
		class="mb-4 max-w-[18ch] text-4xl font-bold leading-tight tracking-tight"
		style="font-size: clamp(2.1rem, 1.7rem + 2vw, 3.052rem);"
	>
		{t('import.hero.title')} <em class="not-italic" style="color: var(--accent);">{t('import.hero.accent')}</em>
	</h1>
	<p class="max-w-[52ch] text-lg leading-relaxed" style="color: var(--text-secondary);">
		{t('import.hero.description')}
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
	<div class="flex justify-center" style="color: var(--text-tertiary);">
		{#if loading}
			<Loader size={40} class="animate-spin" />
		{:else}
			<Upload size={40} />
		{/if}
	</div>
	<div class="mt-4 text-lg font-semibold" style="color: var(--text-primary);">
		{loading ? t('import.dropzone.loading') : t('import.dropzone.idle')}
	</div>
	<div class="mt-2 text-sm" style="color: var(--text-tertiary);">
		ou <span class="font-semibold underline underline-offset-2" style="color: var(--accent);"
			>{t('import.dropzone.browse')}</span
		>
	</div>
</label>

<!-- Try sample data -->
{#if appState.backups.length === 0}
	<div class="mb-8 text-center">
		<button
			class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
			style="background: var(--surface-1); border: 1px solid var(--border); color: var(--text-secondary);"
			onclick={loadSampleData}
			disabled={loadingSamples}
		>
			{#if loadingSamples}
				<Loader size={16} class="animate-spin" />
				{t('import.trySample.loading')}
			{:else}
				<FlaskConical size={16} style="color: var(--accent);" />
				{t('import.trySample')}
			{/if}
		</button>
	</div>
{/if}

<!-- Recent files -->
{#if availableRecent.length > 0 && appState.backups.length === 0}
	<div class="mb-8">
		<h3 class="mb-3 text-sm font-semibold uppercase tracking-wider" style="color: var(--text-tertiary);">
			{t('import.recentFiles')}
		</h3>
		<div class="flex flex-col gap-2">
			{#each availableRecent as meta}
				<div
					class="flex items-center gap-3 rounded-lg border px-4 py-3"
					style="background: var(--surface-1); border-color: var(--border);"
				>
					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-medium">{meta.deviceName}</div>
						<div class="text-xs" style="color: var(--text-tertiary);">
							{meta.fileName} · {formatBytes(meta.sizeBytes)}
						</div>
					</div>
					<button
						class="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
						style="background: var(--accent); color: var(--accent-text);"
						onclick={() => restoreRecent(meta.id)}
						disabled={restoringId === meta.id}
					>
						{#if restoringId === meta.id}
							<Loader size={12} class="animate-spin" />
							{t('import.recentFiles.restoring')}
						{:else}
							<RotateCcw size={12} />
							{t('import.recentFiles.restore')}
						{/if}
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

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
		<h2 class="text-xl font-bold">{t('import.backups.title')}</h2>
		<span class="text-sm font-medium" style="color: var(--text-tertiary);">
			{t('import.backups.count', { count: appState.backups.length })}
		</span>
	</div>

	<div class="mb-8 flex flex-col gap-3">
		{#each appState.backups as backup (backup.id)}
			<div
				class="rounded-xl border p-4 transition-all"
				style="background: var(--surface-1); border-color: var(--border);"
			>
				<div class="mb-1 flex items-center gap-2">
					<h3 class="flex-1 font-semibold">{backup.deviceName}</h3>
					<span class="text-xs" style="color: var(--text-tertiary);">{formatDate(backup.date)}</span>
					<button
						class="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all hover:opacity-70"
						style="background: var(--accent); color: var(--accent-text);"
						onclick={() => appState.openExplorer(backup.archive.database, backup.deviceName)}
						aria-label={t('explorer.explore')}
					>
						<Eye size={14} />
					</button>
					<button
						class="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all hover:opacity-70"
						style="background: var(--surface-2); color: var(--text-tertiary);"
						onclick={() => appState.removeBackup(backup.id)}
						aria-label={t('import.backups.remove')}
					>
						<X size={14} />
					</button>
				</div>
				<div class="mb-3 text-xs" style="color: var(--text-tertiary);">{backup.fileName}</div>
				<div class="flex flex-wrap gap-2">
					{#each [
						{ count: backup.stats.notes, label: t('stats.notes'), color: 'var(--stat-1)' },
						{ count: backup.stats.highlights, label: t('stats.highlights'), color: 'var(--stat-2)' },
						{ count: backup.stats.bookmarks, label: t('stats.bookmarks'), color: 'var(--stat-3)' },
						{ count: backup.stats.tags, label: t('stats.tags'), color: 'var(--stat-4)' },
					] as stat}
						<span
							class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
							style="background: color-mix(in srgb, {stat.color} 15%, transparent); color: {stat.color};"
						>
							<span class="font-bold">{stat.count}</span>
							{stat.label}
						</span>
					{/each}
				</div>
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
				{t('import.mergeArrow', { count: appState.backups.length })}
			</button>
		</div>
	{:else}
		<p class="text-center text-sm" style="color: var(--text-tertiary);">
			{t('import.mergeHint')}
		</p>
	{/if}
{/if}
