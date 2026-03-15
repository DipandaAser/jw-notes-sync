<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { appState, type Screen } from '$lib/stores/app.svelte';

	let { children } = $props();

	const navItems: { id: Screen; label: string }[] = [
		{ id: 'import', label: 'Importer' },
		{ id: 'merge', label: 'Fusionner' },
		{ id: 'export', label: 'Exporter' },
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>JW Notes Sync</title>
</svelte:head>

<div class="flex min-h-screen flex-col" style="background: var(--surface-0); color: var(--text-primary);">
	<!-- Header -->
	<header
		class="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
		style="background: var(--color-jw-header);"
	>
		<button class="flex items-center gap-3 text-white" onclick={() => appState.goTo('import')}>
			<div
				class="grid h-8 w-8 place-items-center rounded text-sm font-bold text-white"
				style="background: var(--color-jw-steel);"
			>
				JW
			</div>
			<span class="text-lg font-bold tracking-tight">JW Notes Sync</span>
		</button>

		<nav
			class="hidden rounded-lg p-1 sm:flex"
			style="background: rgba(255, 255, 255, 0.1); gap: 4px;"
		>
			{#each navItems as item}
				<button
					class="rounded px-4 py-2 text-sm font-medium transition-all"
					class:nav-active={appState.screen === item.id}
					style="color: rgba(255, 255, 255, {appState.screen === item.id ? '1' : '0.65'}); background: {appState.screen === item.id ? 'rgba(255, 255, 255, 0.18)' : 'transparent'};"
					onclick={() => appState.goTo(item.id)}
				>
					{item.label}
				</button>
			{/each}
		</nav>

		<button
			class="grid h-9 w-9 place-items-center rounded text-lg transition-all"
			style="border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);"
			onclick={() => appState.toggleTheme()}
			aria-label="Basculer le thème"
		>
			{appState.theme === 'light' ? '☀' : '☾'}
		</button>
	</header>

	<!-- Mobile nav -->
	<nav
		class="flex border-b sm:hidden"
		style="background: var(--surface-1); border-color: var(--border);"
	>
		{#each navItems as item}
			<button
				class="flex-1 py-3 text-center text-sm font-medium transition-all"
				style="color: {appState.screen === item.id ? 'var(--accent)' : 'var(--text-secondary)'}; border-bottom: 2px solid {appState.screen === item.id ? 'var(--accent)' : 'transparent'};"
				onclick={() => appState.goTo(item.id)}
			>
				{item.label}
			</button>
		{/each}
	</nav>

	<!-- Main -->
	<main class="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
		{@render children()}
	</main>
</div>
