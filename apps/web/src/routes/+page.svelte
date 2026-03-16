<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import ImportScreen from '$lib/components/ImportScreen.svelte';
	import MergeScreen from '$lib/components/MergeScreen.svelte';
	import ExportScreen from '$lib/components/ExportScreen.svelte';
</script>

{#if appState.screen === 'import'}
	<ImportScreen />
{:else if appState.screen === 'merge'}
	<MergeScreen />
{:else if appState.screen === 'export'}
	<ExportScreen />
{/if}
