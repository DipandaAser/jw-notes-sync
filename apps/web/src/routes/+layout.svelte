<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { appState } from '$lib/stores/app.svelte';
	import { House, Settings, Sun, Moon } from 'lucide-svelte';
	import { initI18n, t } from '$lib/i18n.svelte';
	import { onMount } from 'svelte';
	import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';

	let { children } = $props();

	onMount(() => {
		initI18n();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>JW Notes Sync</title>
</svelte:head>

<div class="flex min-h-screen flex-col" style="background: var(--surface-0); color: var(--text-primary);">
	<!-- Header -->
	<header
		class="sticky top-0 z-50 flex items-center justify-between border-b px-6 py-3"
		style="background: var(--surface-0); border-color: var(--border);"
	>
		<button class="flex items-center gap-3" onclick={() => appState.goTo('import')}>
			<div
				class="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
				style="background: var(--color-jw-purple);"
			>
				JW
			</div>
			<span class="text-lg font-bold tracking-tight" style="color: var(--text-primary);">
				Notes Sync
			</span>
		</button>

		<button
			class="grid h-9 w-9 place-items-center rounded-lg transition-all"
			style="background: var(--surface-1); color: var(--text-secondary);"
			onclick={() => appState.toggleTheme()}
			aria-label={t('nav.toggleTheme')}
		>
			{#if appState.theme === 'light'}
				<Sun size={18} />
			{:else}
				<Moon size={18} />
			{/if}
		</button>
	</header>

	<!-- Main -->
	<main class="mx-auto w-full max-w-5xl flex-1 px-6 py-8 pb-24">
		{@render children()}
	</main>

	<!-- Bottom tab bar -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-50 flex border-t"
		style="background: var(--surface-0); border-color: var(--border); padding-bottom: env(safe-area-inset-bottom, 0px);"
	>
		<button
			class="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
			style="color: {appState.tab === 'home' ? 'var(--accent)' : 'var(--text-tertiary)'};"
			onclick={() => appState.goToTab('home')}
		>
			<House size={20} />
			{t('nav.home')}
		</button>
		<button
			class="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
			style="color: {appState.tab === 'settings' ? 'var(--accent)' : 'var(--text-tertiary)'};"
			onclick={() => appState.goToTab('settings')}
		>
			<Settings size={20} />
			{t('nav.settings')}
		</button>
	</nav>
</div>

<OnboardingOverlay />
