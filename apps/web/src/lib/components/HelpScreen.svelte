<script lang="ts">
	import { ChevronDown, ChevronRight } from 'lucide-svelte';
	import { t } from '$lib/i18n.svelte';

	let expanded = $state<Set<string>>(new Set());

	function toggle(key: string) {
		const next = new Set(expanded);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		expanded = next;
	}

	const faqKeys = ['what', 'how', 'import', 'privacy', 'devices', 'conflict'];
</script>

<h1 class="mb-6 text-2xl font-bold">{t('help.title')}</h1>

<div class="flex max-w-lg flex-col gap-1">
	{#each faqKeys as key}
		<div>
			<button
				class="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
				style="background: {expanded.has(key) ? 'var(--surface-2)' : 'var(--surface-1)'};"
				onclick={() => toggle(key)}
			>
				{#if expanded.has(key)}
					<ChevronDown size={16} style="color: var(--text-tertiary);" />
				{:else}
					<ChevronRight size={16} style="color: var(--text-tertiary);" />
				{/if}
				<span class="flex-1 text-sm font-semibold" style="color: var(--text-primary);">
					{t(`help.faq.${key}.q`)}
				</span>
			</button>
			{#if expanded.has(key)}
				<div
					class="ml-10 mr-4 mb-2 rounded-md px-3 py-2 text-sm leading-relaxed"
					style="background: var(--surface-1); color: var(--text-secondary);"
				>
					{t(`help.faq.${key}.a`)}
				</div>
			{/if}
		</div>
	{/each}
</div>
