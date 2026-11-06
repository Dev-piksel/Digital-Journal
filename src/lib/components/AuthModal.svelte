<script lang="ts">
	import type { User } from '#lib/types';
	import { toast } from '#lib/utils/toast.svelte';
	import {
		checkPasswordRequirements,
		calculatePasswordStrength,
		getPasswordValidationErrorMessage
	} from '#lib/utils/password';

	interface Props {
		onSuccess: (user: User) => void;
	}

	let { onSuccess }: Props = $props();

	let mode = $state<'login' | 'register'>('login');
	let username = $state('');
	let displayName = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	// Reactive password requirements and strength
	let reqs = $derived(checkPasswordRequirements(password));
	let strength = $derived(calculatePasswordStrength(password));
	let passwordsMatch = $derived(confirmPassword.length > 0 && password === confirmPassword);
	let passwordsMismatch = $derived(confirmPassword.length > 0 && password !== confirmPassword);

	function fillDemoAccount(demoUsername: string, demoPass: string) {
		mode = 'login';
		username = demoUsername;
		password = demoPass;
		showPassword = false;
		showConfirmPassword = false;
		errorMessage = '';
	}

	function switchMode(newMode: 'login' | 'register') {
		mode = newMode;
		errorMessage = '';
		showPassword = false;
		showConfirmPassword = false;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';

		if (!username.trim() || !password) {
			errorMessage = 'Please enter both username and password.';
			return;
		}

		if (mode === 'register') {
			const pwError = getPasswordValidationErrorMessage(password);
			if (pwError) {
				errorMessage = pwError;
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
			onclick={() => switchMode('login')}
		>
			Sign In
		</button>
		<button
			type="button"
			class="mode-btn {mode === 'register' ? 'active' : ''}"
			onclick={() => switchMode('register')}
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
			<label for="auth-username">Username or Email</label>
			<input
				type="text"
				id="auth-username"
				placeholder="e.g. alex or name@email.com"
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
			<div class="password-input-wrap">
				<input
					type={showPassword ? 'text' : 'password'}
					id="auth-password"
					placeholder={mode === 'register' ? 'Min. 8 characters' : 'Enter your password'}
					bind:value={password}
					required
					autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
				/>
				<button
					type="button"
					class="pw-toggle-btn"
					onclick={() => (showPassword = !showPassword)}
					title={showPassword ? 'Hide password' : 'Show password'}
					aria-label={showPassword ? 'Hide password' : 'Show password'}
				>
					{#if showPassword}
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
							<line x1="1" y1="1" x2="23" y2="23"></line>
						</svg>
					{:else}
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
							<circle cx="12" cy="12" r="3"></circle>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		{#if mode === 'register'}
			<!-- Password Requirements & Strength Indicator -->
			<div class="pw-requirements-box">
				<div class="pw-requirements-header">
					<span class="pw-req-title">Password Requirements:</span>
					{#if password.length > 0}
						<span class="pw-strength-badge" style="color: {strength.color};">
							Strength: <strong>{strength.label}</strong>
						</span>
					{/if}
				</div>

				{#if password.length > 0}
					<div class="pw-meter-bar">
						<div
							class="pw-meter-fill"
							style="width: {(strength.score / 5) * 100}%; background-color: {strength.color};"
						></div>
					</div>
				{/if}

				<div class="pw-requirements-grid">
					<div class="pw-req-item" class:met={reqs.minLength}>
						{#if reqs.minLength}
							<svg class="pw-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						{:else}
							<span class="pw-dot"></span>
						{/if}
						<span>At least 8 characters</span>
					</div>

					<div class="pw-req-item" class:met={reqs.hasUpper}>
						{#if reqs.hasUpper}
							<svg class="pw-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						{:else}
							<span class="pw-dot"></span>
						{/if}
						<span>Uppercase letter (A-Z)</span>
					</div>

					<div class="pw-req-item" class:met={reqs.hasLower}>
						{#if reqs.hasLower}
							<svg class="pw-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						{:else}
							<span class="pw-dot"></span>
						{/if}
						<span>Lowercase letter (a-z)</span>
					</div>

					<div class="pw-req-item" class:met={reqs.hasNumber}>
						{#if reqs.hasNumber}
							<svg class="pw-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						{:else}
							<span class="pw-dot"></span>
						{/if}
						<span>At least 1 number (0-9)</span>
					</div>

					<div class="pw-req-item" class:met={reqs.hasSpecial}>
						{#if reqs.hasSpecial}
							<svg class="pw-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						{:else}
							<span class="pw-dot"></span>
						{/if}
						<span>Special symbol (!@#$%^&*...)</span>
					</div>
				</div>
			</div>

			<div class="form-group">
				<label for="auth-confirm-password">Confirm Password</label>
				<div class="password-input-wrap">
					<input
						type={showConfirmPassword ? 'text' : 'password'}
						id="auth-confirm-password"
						placeholder="Repeat your password"
						bind:value={confirmPassword}
						required
						autocomplete="new-password"
					/>
					<button
						type="button"
						class="pw-toggle-btn"
						onclick={() => (showConfirmPassword = !showConfirmPassword)}
						title={showConfirmPassword ? 'Hide password' : 'Show password'}
						aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
					>
						{#if showConfirmPassword}
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
								<line x1="1" y1="1" x2="23" y2="23"></line>
							</svg>
						{:else}
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
								<circle cx="12" cy="12" r="3"></circle>
							</svg>
						{/if}
					</button>
				</div>
				{#if confirmPassword.length > 0}
					<div class="pw-match-badge" class:matched={passwordsMatch} class:mismatch={passwordsMismatch}>
						{#if passwordsMatch}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
							<span>Passwords match</span>
						{:else}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
							<span>Passwords do not match yet</span>
						{/if}
					</div>
				{/if}
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

	/* Password Input Wrap & Toggle */
	.password-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.password-input-wrap input {
		width: 100%;
		padding-right: 42px;
	}

	.pw-toggle-btn {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: var(--mu);
		cursor: pointer;
		padding: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.pw-toggle-btn:hover {
		color: var(--tx);
		background: rgba(255, 255, 255, 0.07);
	}

	/* Password Requirements Box */
	.pw-requirements-box {
		background: var(--in);
		border: 1px solid var(--bd);
		border-radius: 12px;
		padding: 11px 13px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.pw-requirements-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 11.5px;
	}

	.pw-req-title {
		font-weight: 600;
		color: var(--mu);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.pw-strength-badge {
		font-size: 11.5px;
		font-weight: 600;
	}

	.pw-meter-bar {
		width: 100%;
		height: 4px;
		background: var(--bd);
		border-radius: 999px;
		overflow: hidden;
	}

	.pw-meter-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.25s ease, background-color 0.25s ease;
	}

	.pw-requirements-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 5px;
	}

	.pw-req-item {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 12px;
		color: var(--mu);
		transition: color 0.15s ease;
	}

	.pw-req-item.met {
		color: #10b981;
		font-weight: 500;
	}

	.pw-check-icon {
		stroke: #10b981;
		flex-shrink: 0;
	}

	.pw-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--bd);
		margin: 4px;
		flex-shrink: 0;
	}

	/* Match badge */
	.pw-match-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		margin-top: 3px;
	}

	.pw-match-badge.matched {
		color: #10b981;
	}

	.pw-match-badge.mismatch {
		color: var(--dg);
	}

	.auth-submit-btn {
		width: 100%;
		padding: 11px;
		font-size: 15px;
		margin-top: 6px;
	}
</style>
