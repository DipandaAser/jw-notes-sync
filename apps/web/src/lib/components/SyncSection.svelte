<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { t, getLocale } from '$lib/i18n.svelte';
	import { Cloud, CloudOff, CloudUpload, CloudDownload, RefreshCw, Loader, AlertTriangle, Check } from 'lucide-svelte';

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(getLocale(), {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return iso;
		}
	}

	let showConflict = $state(false);

	async function handleConnect() {
		await appState.connectGoogleDrive();
		if (appState.syncStatus === 'connected') {
			const status = await appState.checkCloudStatus();
			if (status?.hasConflict) {
				showConflict = true;
			} else if (status?.needsDownload) {
				await appState.syncFromCloud();
			} else if (status?.needsUpload) {
				await appState.syncToCloud();
			}
		}
	}

	async function handleSync() {
		const status = await appState.checkCloudStatus();
		if (status?.hasConflict) {
			showConflict = true;
		} else if (status?.needsDownload) {
			await appState.syncFromCloud();
		} else {
			await appState.syncToCloud();
		}
	}

	async function resolveConflict(choice: 'local' | 'remote') {
		showConflict = false;
		if (choice === 'local') {
			await appState.syncToCloud();
		} else {
			await appState.syncFromCloud();
		}
	}
</script>

<h2 class="mb-3 flex items-center gap-2 text-lg font-bold">
	<Cloud size={20} style="color: var(--accent);" />
	{t('sync.title')}
</h2>

{#if appState.syncStatus === 'disconnected'}
	<p class="mb-4 text-sm" style="color: var(--text-tertiary);">
		{t('sync.description')}
	</p>
	<button
		class="flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all"
		style="background: var(--surface-1); border-color: var(--border); color: var(--text-primary);"
		onclick={handleConnect}
	>
		<CloudUpload size={18} style="color: var(--accent);" />
		{t('sync.connect')}
	</button>

{:else if appState.syncStatus === 'connecting'}
	<div class="flex items-center gap-2 text-sm" style="color: var(--text-tertiary);">
		<Loader size={16} class="animate-spin" />
		{t('sync.connect')}…
	</div>

{:else if appState.syncStatus === 'syncing'}
	<div
		class="rounded-lg border p-4"
		style="background: var(--surface-1); border-color: var(--border);"
	>
		<div class="flex items-center gap-2 text-sm font-medium" style="color: var(--accent);">
			<Loader size={16} class="animate-spin" />
			{t('sync.uploading')}
		</div>
	</div>

{:else if appState.syncStatus === 'connected'}
	<div
		class="rounded-lg border p-4"
		style="background: var(--surface-1); border-color: var(--border);"
	>
		<div class="mb-2 flex items-center gap-2">
			<Check size={16} style="color: var(--success);" />
			<span class="text-sm font-medium" style="color: var(--text-primary);">
				{t('sync.connected')}
			</span>
		</div>
		<div class="mb-3 text-xs" style="color: var(--text-tertiary);">
			{#if appState.syncMeta?.lastSyncedAt}
				{t('sync.lastSync', { date: formatDate(appState.syncMeta.lastSyncedAt) })}
			{:else}
				{t('sync.neverSynced')}
			{/if}
		</div>
		<div class="flex gap-2">
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
				style="background: var(--accent); color: var(--accent-text);"
				onclick={handleSync}
			>
				<RefreshCw size={12} />
				{t('sync.syncNow')}
			</button>
			<button
				class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
				style="background: var(--surface-2); color: var(--text-tertiary);"
				onclick={() => appState.disconnectGoogleDrive()}
			>
				<CloudOff size={12} />
				{t('sync.disconnect')}
			</button>
		</div>
	</div>

{:else if appState.syncStatus === 'error'}
	<div
		class="rounded-lg border p-4"
		style="background: var(--danger-subtle); border-color: var(--danger);"
	>
		<div class="mb-2 flex items-center gap-2">
			<AlertTriangle size={16} style="color: var(--danger);" />
			<span class="text-sm font-medium" style="color: var(--danger);">
				{t('sync.error')}
			</span>
		</div>
		{#if appState.syncError}
			<p class="mb-3 text-xs" style="color: var(--text-secondary);">{appState.syncError}</p>
		{/if}
		<button
			class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
			style="background: var(--accent); color: var(--accent-text);"
			onclick={handleSync}
		>
			{t('sync.retry')}
		</button>
	</div>
{/if}

<!-- Conflict dialog -->
{#if showConflict}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-6"
		style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);"
	>
		<div
			class="w-full max-w-sm rounded-2xl border p-6 text-center"
			style="background: var(--surface-0); border-color: var(--border);"
		>
			<AlertTriangle size={32} style="color: var(--accent); margin: 0 auto 12px;" />
			<h3 class="mb-2 text-lg font-bold">{t('sync.conflict.title')}</h3>
			<p class="mb-6 text-sm" style="color: var(--text-secondary);">
				{t('sync.conflict.desc')}
			</p>
			<div class="flex flex-col gap-2">
				<button
					class="rounded-lg px-4 py-2.5 text-sm font-semibold"
					style="background: var(--accent); color: var(--accent-text);"
					onclick={() => resolveConflict('local')}
				>
					<CloudUpload size={14} class="mr-1 inline-block" />
					{t('sync.conflict.keepLocal')}
				</button>
				<button
					class="rounded-lg px-4 py-2.5 text-sm font-semibold"
					style="background: var(--surface-2); color: var(--text-secondary);"
					onclick={() => resolveConflict('remote')}
				>
					<CloudDownload size={14} class="mr-1 inline-block" />
					{t('sync.conflict.keepRemote')}
				</button>
				<button
					class="text-sm font-medium"
					style="color: var(--text-tertiary);"
					onclick={() => (showConflict = false)}
				>
					{t('common.cancel')}
				</button>
			</div>
		</div>
	</div>
{/if}
