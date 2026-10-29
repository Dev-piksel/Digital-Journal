<script lang="ts">
	import type { User } from '#lib/types';
	import { toast } from '#lib/utils/toast.svelte';

	interface Props {
		onSuccess: (user: User) => void;
	}

	let { onSuccess }: Props = $props();

	let mode = $state<'login' | 'register'>('login');
	let username = $state('');
	let displayName = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	function fillDemoAccount(demoUsername: string, demoPass: string) {
		mode = 'login';
		username = demoUsername;
		password = demoPass;
		errorMessage = '';
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';

		if (!username.trim() || !password) {
			errorMessage = 'Please enter both username and password.';
			return;
		}

		if (mode === 'register') {
			if (password.length < 6) {
				errorMessage = 'Password must be at least 6 characters.';
				return;
			}
			if (password !== confirmPassword) {
				errorMessage = 'Passwords do not match.';
				return;
			}
		}

		isSubmitting = true;

		try {
			const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
			const payload =
				mode === 'login'
					? { username: username.trim(), password }
					: { username: username.trim(), password, displayName: displayName.trim() };

			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();

			if (!res.ok) {
				errorMessage = data.error || 'Authentication failed. Please try again.';
				return;
			}

			toast.show(
				mode === 'login'
					? `Welcome back, ${data.user.displayName}!`
					: `Account created! Welcome, ${data.user.displayName}!`,
				'success'
			);

			onSuccess(data.user);
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Network error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="auth-card card">
	<div class="auth-header">
		<div class="auth-badge">Private & Encrypted · SQLite</div>
		<h2>{mode === 'login' ? 'Sign in to Journal' : 'Create your Journal'}</h2>
		<p class="mu">
			{mode === 'login'
				? 'Access your private reflections, daily moods, and memories.'
				: 'Begin your personal journaling journey with local-first security.'}
		</p>
	</div>

	<!-- Demo Accounts Quick Fill -->
	<div class="demo-pills-row">
		<span class="demo-lbl">Quick Demo Login:</span>
		<button
			type="button"
			class="demo-chip"
			onclick={() => fillDemoAccount('admin', 'admin123')}
			title="Sign in as Administrator"
		>
			🛡️ Admin (admin / admin123)
		</button>
		<button
			type="button"
			class="demo-chip"
			onclick={() => fillDemoAccount('demo', 'user123')}
			title="Sign in as Regular User"
		>
			✍️ User (demo / user123)
		</button>
	</div>

	<!-- Auth Mode Switcher -->
	<div class="mode-switcher">
		<button
			type="button"
			class="mode-btn {mode === 'login' ? 'active' : ''}"
			onclick={() => {
				mode = 'login';
				errorMessage = '';
			}}
		>
			Sign In
		</button>
		<button
			type="button"
			class="mode-btn {mode === 'register' ? 'active' : ''}"
			onclick={() => {
				mode = 'register';
				errorMessage = '';
			}}
		>
			New Account
		</button>
	</div>

	{#if errorMessage}
		<div class="auth-error-alert" role="alert">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			<span>{errorMessage}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="auth-form">
		<div class="form-group">
			<label for="auth-username">Username</label>
			<input
				type="text"
				id="auth-username"
				placeholder="e.g. alex or admin"
				bind:value={username}
				required
				autocomplete="username"
			/>
		</div>

		{#if mode === 'register'}
			<div class="form-group">
				<label for="auth-display-name">Display Name (Optional)</label>
				<input
					type="text"
					id="auth-display-name"
					placeholder="e.g. Alex Chen"
					bind:value={displayName}
					autocomplete="name"
				/>
			</div>
		{/if}

		<div class="form-group">
			<label for="auth-password">Password</label>
			<input
				type="password"
				id="auth-password"
				placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
				bind:value={password}
				required
				autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
			/>
		</div>

		{#if mode === 'register'}
			<div class="form-group">
				<label for="auth-confirm-password">Confirm Password</label>
				<input
					type="password"
					id="auth-confirm-password"
					placeholder="Repeat your password"
					bind:value={confirmPassword}
					required
					autocomplete="new-password"
				/>
			</div>
		{/if}

		<button type="submit" class="btn pri auth-submit-btn" disabled={isSubmitting}>
			{#if isSubmitting}
				Authenticating...
			{:else if mode === 'login'}
				Sign In
			{:else}
				Create Account & Sign In
			{/if}
		</button>
	</form>
</div>

<style>
	.auth-card {
		max-width: 460px;
		margin: 40px auto;
		padding: 32px 28px;
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.auth-header {
		text-align: center;
		margin-bottom: 20px;
	}

	.auth-badge {
		display: inline-block;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		background: var(--ac-light);
		color: var(--ac);
		border: 1px solid var(--ac);
		padding: 3px 10px;
		border-radius: 999px;
		margin-bottom: 10px;
	}

	.auth-header h2 {
		font-size: 26px;
		margin-bottom: 6px;
	}

	.demo-pills-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
		background: var(--in);
		border: 1px solid var(--bd);
		border-radius: 14px;
		padding: 10px 12px;
		margin-bottom: 18px;
	}

	.demo-lbl {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--mu);
	}

	.demo-chip {
		text-align: left;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid var(--bd);
		background: var(--card);
		font-size: 12.5px;
		color: var(--tx);
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.demo-chip:hover {
		border-color: var(--ac);
		background: var(--ac-light);
		color: var(--ac);
	}

	.mode-switcher {
		display: grid;
		grid-template-columns: 1fr 1fr;
		background: var(--in);
		border: 1px solid var(--bd);
		border-radius: 999px;
		padding: 4px;
		margin-bottom: 18px;
	}

	.mode-btn {
		padding: 8px;
		border-radius: 999px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--mu);
		text-align: center;
		transition: all 0.2s ease;
	}

	.mode-btn.active {
		background: var(--ac);
		color: #171410;
		font-weight: 600;
		box-shadow: 0 2px 8px var(--ac-glow);
	}

	.auth-error-alert {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--dg-light);
		color: var(--dg);
		border: 1px solid var(--dg);
		padding: 10px 14px;
		border-radius: 12px;
		font-size: 13px;
		margin-bottom: 16px;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
		text-align: left;
	}

	.form-group label {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--mu);
	}

	.auth-submit-btn {
		width: 100%;
		padding: 11px;
		font-size: 15px;
		margin-top: 8px;
	}
</style>
