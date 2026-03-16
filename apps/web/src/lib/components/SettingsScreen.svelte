<script lang="ts">
	import { Mail, Github } from 'lucide-svelte';
</script>

<h1 class="mb-6 text-2xl font-bold">Paramètres</h1>

<div class="flex max-w-lg flex-col gap-3">
	<a
		href="mailto:aserdipanda@gmail.com?subject=JW Notes Sync - Feedback"
		class="flex items-center gap-3 rounded-xl border p-4 transition-all"
		style="background: var(--surface-1); border-color: var(--border);"
	>
		<Mail size={22} style="color: var(--accent);" />
		<div>
			<div class="font-semibold" style="color: var(--text-primary);">Envoyer un commentaire</div>
			<div class="mt-0.5 text-sm" style="color: var(--text-tertiary);">aserdipanda@gmail.com</div>
		</div>
	</a>

	<a
		href="https://github.com/DipandaAser/jw-notes-sync"
		target="_blank"
		rel="noopener"
		class="flex items-center gap-3 rounded-xl border p-4 transition-all"
		style="background: var(--surface-1); border-color: var(--border);"
	>
		<Github size={22} style="color: var(--accent);" />
		<div>
			<div class="font-semibold" style="color: var(--text-primary);">Voir le code source</div>
			<div class="mt-0.5 text-sm" style="color: var(--text-tertiary);">GitHub</div>
		</div>
	</a>
</div>
