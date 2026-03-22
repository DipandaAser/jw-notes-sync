<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { t } from '$lib/i18n.svelte';
	import { Merge, Upload, Download, ShieldCheck } from 'lucide-svelte';

	const TOTAL_STEPS = 4;

	const icons = [Merge, Upload, Download, ShieldCheck];

	function next() {
		if (appState.onboardingStep < TOTAL_STEPS - 1) {
			appState.onboardingStep++;
		} else {
			appState.completeOnboarding();
		}
	}

	function back() {
		if (appState.onboardingStep > 0) {
			appState.onboardingStep--;
		}
	}

	function skip() {
		appState.completeOnboarding();
	}

	const step = $derived(appState.onboardingStep);
</script>

{#if appState.showOnboarding}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-6"
		style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);"
	>
		<!-- Card -->
		<div
			class="w-full max-w-md rounded-2xl border p-8 text-center"
			style="background: var(--surface-0); border-color: var(--border); box-shadow: var(--shadow-md);"
		>
			<!-- Icon -->
			<div
				class="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full"
				style="background: var(--accent); color: var(--accent-text);"
			>
				{#if step === 0}
					<Merge size={28} />
				{:else if step === 1}
					<Upload size={28} />
				{:else if step === 2}
					<Download size={28} />
				{:else}
					<ShieldCheck size={28} />
				{/if}
			</div>

			<!-- Content -->
			<h2 class="mb-3 text-xl font-bold">
				{t(`onboarding.step${step + 1}.title`)}
			</h2>
			<p class="mb-8 text-sm leading-relaxed" style="color: var(--text-secondary);">
				{t(`onboarding.step${step + 1}.desc`)}
			</p>

			<!-- Progress dots -->
			<div class="mb-6 flex justify-center gap-2">
				{#each Array(TOTAL_STEPS) as _, i}
					<div
						class="h-2 rounded-full transition-all"
						style="width: {i === step ? '24px' : '8px'}; background: {i === step ? 'var(--accent)' : 'var(--surface-2)'};"
					></div>
				{/each}
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-between">
				<button
					class="text-sm font-medium transition-all"
					style="color: var(--text-tertiary);"
					onclick={skip}
				>
					{t('onboarding.skip')}
				</button>

				<div class="flex gap-2">
					{#if step > 0}
						<button
							class="rounded-lg px-4 py-2 text-sm font-semibold transition-all"
							style="background: var(--surface-2); color: var(--text-secondary);"
							onclick={back}
						>
							{t('onboarding.back')}
						</button>
					{/if}
					<button
						class="rounded-lg px-5 py-2 text-sm font-semibold transition-all"
						style="background: var(--accent); color: var(--accent-text);"
						onclick={next}
					>
						{step < TOTAL_STEPS - 1 ? t('onboarding.next') : t('onboarding.done')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
