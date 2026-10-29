<script lang="ts">
	import { toast } from '#lib/utils/toast.svelte';
</script>

<div class="toast-container" aria-live="polite">
	{#each toast.toasts as t (t.id)}
		<div class="toast {t.type || 'info'}">
			{#if t.type === 'success'}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ac2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
			{:else if t.type === 'danger'}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="15" y1="9" x2="9" y2="15"></line>
					<line x1="9" y1="9" x2="15" y2="15"></line>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="12" y1="16" x2="12" y2="12"></line>
					<line x1="12" y1="8" x2="12.01" y2="8"></line>
				</svg>
			{/if}
			<span>{t.text}</span>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 120;
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: none;
	}

	.toast {
		background: var(--card-solid);
		border: 1px solid var(--bd-strong);
		color: var(--tx);
		padding: 10px 18px;
		border-radius: 12px;
		box-shadow: var(--shadow-lg);
		font-size: 14px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 10px;
		pointer-events: auto;
		animation: slideToast 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.toast.success {
		border-color: var(--ac2);
	}

	.toast.danger {
		border-color: var(--dg);
	}

	@keyframes slideToast {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
