<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { runMerge } from '$lib/merge';
	import { Check, CircleDot, Circle, ArrowDown } from 'lucide-svelte';
	import { t, getLocale } from '$lib/i18n.svelte';

	function startMerge() {
		if (appState.backups.length < 2) return;
		const archiveA = appState.backups[0]!.archive;
		const archiveB = appState.backups[1]!.archive;
		runMerge(archiveA, archiveB);
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

	const backupA = $derived(appState.backups[0]);
	const backupB = $derived(appState.backups[1]);
</script>

{#if !backupA || !backupB}
	<div class="py-16 text-center">
		<p style="color: var(--text-secondary);">{t('merge.noBackups')}</p>
		<button
			class="mt-4 rounded-lg px-6 py-3 font-semibold transition-all"
			style="background: var(--accent); color: var(--accent-text);"
			onclick={() => appState.goTo('import')}
		>
			{t('merge.back')}
		</button>
	</div>
{:else}
	<!-- Source comparison -->
	<div class="mb-8 grid gap-6" style="grid-template-columns: 1fr 1fr;">
		<!-- Source A -->
		<div class="rounded-xl border p-6" style="background: var(--surface-1); border-color: var(--border);">
			<div class="mb-6 flex items-center gap-3 border-b pb-4" style="border-color: var(--border);">
				<div
					class="grid h-7 w-7 place-items-center rounded-full text-sm font-bold"
					style="background: var(--accent); color: var(--accent-text);"
				>
					A
				</div>
				<div>
					<div class="font-semibold">{backupA.deviceName}</div>
					<div class="text-xs" style="color: var(--text-tertiary);">{formatDate(backupA.date)}</div>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-3">
				{#each [
					{ value: backupA.stats.notes, label: t('stats.notes') },
					{ value: backupA.stats.highlights, label: t('stats.highlights') },
					{ value: backupA.stats.bookmarks, label: t('stats.bookmarks') },
					{ value: backupA.stats.tags, label: t('stats.tags') },
				] as stat}
					<div class="rounded p-3" style="background: var(--surface-2);">
						<div class="text-xl font-bold tabular-nums">{stat.value.toLocaleString(getLocale())}</div>
						<div class="text-xs" style="color: var(--text-secondary);">{stat.label}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Source B -->
		<div class="rounded-xl border p-6" style="background: var(--surface-1); border-color: var(--border);">
			<div class="mb-6 flex items-center gap-3 border-b pb-4" style="border-color: var(--border);">
				<div
					class="grid h-7 w-7 place-items-center rounded-full text-sm font-bold"
					style="background: var(--warm); color: white;"
				>
					B
				</div>
				<div>
					<div class="font-semibold">{backupB.deviceName}</div>
					<div class="text-xs" style="color: var(--text-tertiary);">{formatDate(backupB.date)}</div>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-3">
				{#each [
					{ value: backupB.stats.notes, label: t('stats.notes') },
					{ value: backupB.stats.highlights, label: t('stats.highlights') },
					{ value: backupB.stats.bookmarks, label: t('stats.bookmarks') },
					{ value: backupB.stats.tags, label: t('stats.tags') },
				] as stat}
					<div class="rounded p-3" style="background: var(--surface-2);">
						<div class="text-xl font-bold tabular-nums">{stat.value.toLocaleString(getLocale())}</div>
						<div class="text-xs" style="color: var(--text-secondary);">{stat.label}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Merge button / progress -->
	{#if appState.mergeStatus === 'idle'}
		<div class="mb-6 flex justify-center" style="color: var(--text-tertiary);"><ArrowDown size={20} /></div>
		<div class="text-center">
			<button
				class="rounded-xl px-8 py-4 text-base font-semibold tracking-tight transition-all hover:-translate-y-0.5"
				style="background: var(--accent); color: var(--accent-text);"
				onclick={startMerge}
			>
				{t('merge.button')}
			</button>
		</div>
	{:else if appState.mergeStatus === 'merging'}
		<!-- Progress -->
		<div class="mb-8">
			<div class="mb-3 flex items-baseline justify-between">
				<span class="text-sm font-semibold">{t('merge.progress')}</span>
				<span class="text-sm tabular-nums" style="color: var(--text-secondary);">
					{appState.mergeProgress.percent}%
				</span>
			</div>
			<div class="h-1.5 overflow-hidden rounded-full" style="background: var(--surface-2);">
				<div
					class="h-full rounded-full transition-all duration-400"
					style="width: {appState.mergeProgress.percent}%; background: var(--accent);"
				></div>
			</div>
			<div class="mt-4 flex flex-wrap gap-4">
				{#each appState.mergeProgress.steps as step}
					<span
						class="flex items-center gap-1 text-xs"
						style="color: {step.status === 'done'
							? 'var(--success)'
							: step.status === 'current'
								? 'var(--accent)'
								: 'var(--text-tertiary)'}; font-weight: {step.status === 'current' ? '600' : '400'};"
					>
						{#if step.status === "done"}<Check size={12} />{:else if step.status === "current"}<CircleDot size={12} />{:else}<Circle size={12} />{/if}
						{step.name}
					</span>
				{/each}
			</div>
		</div>
	{:else if appState.mergeStatus === 'error'}
		<div
			class="rounded-lg px-4 py-3 text-sm font-medium"
			style="background: var(--danger-subtle); color: var(--danger);"
		>
			{t('merge.errorPrefix', { message: appState.mergeError })}
		</div>
	{/if}
{/if}
