<script lang="ts">
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'primary';
		isLoading?: boolean;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		variant = 'danger',
		isLoading = false,
		onConfirm,
		onCancel
	}: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape' && !isLoading) {
			onCancel();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isLoading) {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-modal-title"
		aria-describedby="confirm-modal-desc"
		tabindex="-1"
		onclick={handleBackdropClick}
	>
		<div class="confirm-card card" onclick={(e) => e.stopPropagation()}>
			<div class="confirm-body">
				<div class="confirm-icon-wrap {variant}">
					{#if variant === 'danger'}
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
							<line x1="12" y1="9" x2="12" y2="13"></line>
							<line x1="12" y1="17" x2="12.01" y2="17"></line>
						</svg>
					{:else if variant === 'warning'}
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="8" x2="12" y2="12"></line>
							<line x1="12" y1="16" x2="12.01" y2="16"></line>
						</svg>
					{:else}
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
						</svg>
					{/if}
				</div>

				<div class="confirm-text">
					<h3 id="confirm-modal-title">{title}</h3>
					<p id="confirm-modal-desc">{message}</p>
				</div>
			</div>

			<div class="confirm-actions">
				<button
					type="button"
					class="btn"
					onclick={onCancel}
					disabled={isLoading}
				>
					{cancelText}
				</button>

				<button
					type="button"
					class="btn {variant === 'danger' ? 'dg' : 'pri'}"
					onclick={onConfirm}
					disabled={isLoading}
				>
					{#if isLoading}
						<svg class="spinning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<circle cx="12" cy="12" r="10" stroke-opacity="0.25" stroke="currentColor" stroke-width="4"></circle>
							<path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" stroke-width="4"></path>
						</svg>
						<span>Processing...</span>
					{:else}
						<span>{confirmText}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(5px);
		-webkit-backdrop-filter: blur(5px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 1200;
		animation: fadeIn 0.15s ease-out;
	}

	.confirm-card {
		width: 100%;
		max-width: 440px;
		background: var(--card-solid);
		border: 1px solid var(--bd-strong);
		border-radius: 18px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
		animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.confirm-body {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.confirm-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.confirm-icon-wrap.danger {
		background: rgba(220, 124, 112, 0.15);
		color: var(--dg);
		border: 1px solid rgba(220, 124, 112, 0.35);
	}

	.confirm-icon-wrap.warning {
		background: rgba(210, 168, 117, 0.15);
		color: var(--ac);
		border: 1px solid rgba(210, 168, 117, 0.35);
	}

	.confirm-icon-wrap.primary {
		background: rgba(138, 163, 133, 0.15);
		color: var(--ac2);
		border: 1px solid rgba(138, 163, 133, 0.35);
	}

	.confirm-text {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.confirm-text h3 {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		color: var(--tx);
		line-height: 1.3;
	}

	.confirm-text p {
		margin: 0;
		font-size: 13.5px;
		color: var(--mu);
		line-height: 1.5;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 10px;
	}

	.spinning {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes scaleUp {
		from { opacity: 0; transform: scale(0.95) translateY(6px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}
</style>
