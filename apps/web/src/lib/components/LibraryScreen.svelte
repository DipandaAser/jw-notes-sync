<script lang="ts">
	import { parseJWLibrary } from '@jw-notes-sync/core';
	import { webAdapter } from '$lib/adapter';
	import { appState, type ImportedBackup } from '$lib/stores/app.svelte';
	import { t, getLocale } from '$lib/i18n.svelte';
	import { formatBytes } from '$lib/format';
	import { loadBackupBytes, saveBackup } from '$lib/storage';
	import { Star, Plus, Merge, Download, Eye, X, Smartphone, Loader } from 'lucide-svelte';

	let loadingTruth = $state(false);
	let addingFile = $state(false);
	let fileInput: HTMLInputElement;

	async function onFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || !file.name.endsWith('.jwlibrary')) return;

		addingFile = true;
		try {
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
					tags: db.tags.length
				}
			};
			appState.addBackup(backup, bytes);
			await appState.startLibraryMerge(backup);
		} finally {
			addingFile = false;
		}
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(getLocale(), {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}

	const originals = $derived(appState.recentFiles.filter((m) => !m.isMerged));
	const mergedFiles = $derived(
		appState.recentFiles.filter((m) => m.isMerged && !m.isSourceOfTruth)
	);
	async function downloadTruth() {
		if (!appState.sourceOfTruth || loadingTruth) return;
		loadingTruth = true;
		try {
			const bytes = await loadBackupBytes(appState.sourceOfTruth.id);
			if (!bytes) return;
			const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = appState.sourceOfTruth.fileName;
			link.click();
			URL.revokeObjectURL(url);
		} finally {
			loadingTruth = false;
		}
	}
</script>

<!-- Hidden file input for adding backups -->
<input
	type="file"
	accept=".jwlibrary"
	class="hidden"
	bind:this={fileInput}
	onchange={onFileSelected}
/>

<h1 class="mb-6 text-2xl font-bold">{t('library.title')}</h1>

<!-- Source of truth -->
{#if appState.sourceOfTruth}
	{@const truth = appState.sourceOfTruth}
	<div
		class="mb-8 rounded-xl border-2 p-5"
		style="background: var(--surface-1); border-color: var(--accent);"
	>
		<div class="mb-1 flex items-center gap-2">
			<h3 class="flex-1 truncate text-lg font-bold">{truth.deviceName}</h3>
			<span class="text-xs" style="color: var(--text-tertiary);">{formatDate(truth.date)}</span>
		</div>
		<div class="mb-3 text-xs" style="color: var(--text-tertiary);">
			{truth.fileName} · {formatBytes(truth.sizeBytes)}
		</div>
		<div class="mb-4 flex flex-wrap gap-2">
			{#each [{ count: truth.stats.notes, label: t('stats.notes'), color: 'var(--stat-1)' }, { count: truth.stats.highlights, label: t('stats.highlights'), color: 'var(--stat-2)' }, { count: truth.stats.bookmarks, label: t('stats.bookmarks'), color: 'var(--stat-3)' }, { count: truth.stats.tags, label: t('stats.tags'), color: 'var(--stat-4)' }] as stat}
				<span
					class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
					style="background: color-mix(in srgb, {stat.color} 15%, transparent); color: {stat.color};"
				>
					<span class="font-bold">{stat.count}</span>
					{stat.label}
				</span>
			{/each}
		</div>
		<p class="mb-4 text-xs" style="color: var(--text-tertiary);">
			{t('library.sourceOfTruth.desc')}
		</p>
		<div class="flex gap-2">
			<button
				class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
				style="background: var(--accent); color: var(--accent-text);"
				onclick={downloadTruth}
				disabled={loadingTruth}
			>
				{#if loadingTruth}
					<Loader size={14} class="animate-spin" />
				{:else}
					<Download size={14} />
				{/if}
				{t('library.download')}
			</button>
			<button
				class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
				style="background: var(--surface-2); color: var(--text-secondary);"
				onclick={() =>
					appState
						.restoreBackup(truth)
						.then(
							(ok) =>
								ok &&
								appState.openExplorer(
									appState.backups[appState.backups.length - 1]!.archive.database,
									truth.deviceName
								)
						)}
			>
				<Eye size={14} />
				{t('explorer.explore')}
			</button>
		</div>
	</div>
{/if}

<!-- Actions -->
<div class="mb-8 flex flex-wrap gap-3">
	<button
		class="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5"
		style="background: var(--accent); color: var(--accent-text);"
		onclick={() => fileInput.click()}
		disabled={addingFile}
	>
		{#if addingFile}
			<Loader size={18} class="animate-spin" />
		{:else}
			<Plus size={18} />
		{/if}
		{t('library.addBackup')}
	</button>
	{#if originals.length >= 2}
		<button
			class="flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-all"
			style="background: var(--surface-1); border-color: var(--border); color: var(--text-secondary);"
			onclick={() => appState.startQuickMerge()}
		>
			<Merge size={18} />
			{t('library.quickMerge')}
		</button>
	{/if}
</div>

<!-- Original files -->
{#if originals.length > 0}
	<h2
		class="mb-3 text-sm font-semibold uppercase tracking-wider"
		style="color: var(--text-tertiary);"
	>
		{t('library.originals')}
	</h2>
	<div class="mb-8 flex flex-col gap-2">
		{#each originals as meta}
			<div
				class="rounded-xl border p-4"
				style="background: var(--surface-1); border-color: var(--border);"
			>
				<div class="mb-1 flex items-center gap-2">
					<Smartphone size={16} style="color: var(--text-tertiary);" />
					<span class="min-w-0 flex-1 truncate text-sm font-semibold">{meta.deviceName}</span>
					<span class="text-xs" style="color: var(--text-tertiary);">{formatDate(meta.date)}</span>
					<button
						class="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all hover:opacity-70"
						style="background: var(--surface-2); color: var(--text-tertiary);"
						onclick={() => appState.removeBackup(meta.id)}
						aria-label={t('import.backups.remove')}
					>
						<X size={14} />
					</button>
				</div>
				<div class="mb-3 text-xs" style="color: var(--text-tertiary);">
					{meta.fileName} · {formatBytes(meta.sizeBytes)}
				</div>
				<div class="flex flex-wrap gap-2">
					{#each [
						{ count: meta.stats.notes, label: t('stats.notes'), color: 'var(--stat-1)' },
						{ count: meta.stats.highlights, label: t('stats.highlights'), color: 'var(--stat-2)' },
						{ count: meta.stats.bookmarks, label: t('stats.bookmarks'), color: 'var(--stat-3)' },
						{ count: meta.stats.tags, label: t('stats.tags'), color: 'var(--stat-4)' },
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
{/if}

<!-- Older merged files -->
{#if mergedFiles.length > 0}
	<h2
		class="mb-3 text-sm font-semibold uppercase tracking-wider"
		style="color: var(--text-tertiary);"
	>
		{t('library.merged')}
	</h2>
	<div class="mb-8 flex flex-col gap-2">
		{#each mergedFiles as meta}
			<div
				class="rounded-xl border p-4"
				style="background: var(--surface-1); border-color: var(--border);"
			>
				<div class="mb-1 flex items-center gap-2">
					<Merge size={16} style="color: var(--accent);" />
					<span class="min-w-0 flex-1 truncate text-sm font-semibold">{meta.deviceName}</span>
					<span class="text-xs" style="color: var(--text-tertiary);">{formatDate(meta.date)}</span>
					<span
						class="shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
						style="background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent);"
					>
						{t('library.badge.merged')}
					</span>
				</div>
				<div class="mb-3 text-xs" style="color: var(--text-tertiary);">
					{meta.fileName} · {formatBytes(meta.sizeBytes)}
				</div>
				<div class="flex flex-wrap gap-2">
					{#each [
						{ count: meta.stats.notes, label: t('stats.notes'), color: 'var(--stat-1)' },
						{ count: meta.stats.highlights, label: t('stats.highlights'), color: 'var(--stat-2)' },
						{ count: meta.stats.bookmarks, label: t('stats.bookmarks'), color: 'var(--stat-3)' },
						{ count: meta.stats.tags, label: t('stats.tags'), color: 'var(--stat-4)' },
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
{/if}
