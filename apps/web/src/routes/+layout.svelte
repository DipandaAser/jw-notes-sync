<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { appState, type Screen } from '$lib/stores/app.svelte';

	let { children } = $props();

	const navItems: { id: Screen; label: string; icon: string }[] = [
		{ id: 'import', label: 'Importer', icon: '↓' },
		{ id: 'merge', label: 'Fusionner', icon: '⇄' },
		{ id: 'export', label: 'Exporter', icon: '↑' },
	];
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

		<!-- Desktop nav -->
		<nav class="hidden items-center gap-1 sm:flex">
			{#each navItems as item}
				<button
					class="relative px-4 py-2 text-sm font-medium transition-colors"
					style="color: {appState.screen === item.id ? 'var(--accent)' : 'var(--text-secondary)'};"
					onclick={() => appState.goTo(item.id)}
				>
					{item.label}
					{#if appState.screen === item.id}
						<div
							class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
							style="background: var(--accent);"
						></div>
					{/if}
				</button>
			{/each}
		</nav>

		<button
			class="grid h-9 w-9 place-items-center rounded-lg text-lg transition-all"
			style="background: var(--surface-1); color: var(--text-secondary);"
			onclick={() => appState.toggleTheme()}
			aria-label="Basculer le thème"
		>
			{appState.theme === 'light' ? '☀' : '☾'}
		</button>
	</header>

	<!-- Main -->
	<main class="mx-auto w-full max-w-5xl flex-1 px-6 py-8 pb-24 sm:pb-8">
		{@render children()}
	</main>

	<!-- Mobile bottom tab bar -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-50 flex border-t sm:hidden"
		style="background: var(--surface-0); border-color: var(--border); padding-bottom: env(safe-area-inset-bottom, 0px);"
	>
		{#each navItems as item}
			<button
				class="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
				style="color: {appState.screen === item.id ? 'var(--accent)' : 'var(--text-tertiary)'};"
				onclick={() => appState.goTo(item.id)}
			>
				<span class="text-lg leading-none">{item.icon}</span>
				{item.label}
			</button>
		{/each}
	</nav>
</div>
