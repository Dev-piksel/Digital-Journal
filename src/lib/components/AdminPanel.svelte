<script lang="ts">
	import { onMount } from 'svelte';
	import type { UserWithStats } from '#lib/types';
	import { formatDate } from '#lib/utils/markdown';
	import { toast } from '#lib/utils/toast.svelte';

	let users = $state<UserWithStats[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let searchQuery = $state('');
	let roleFilter = $state<'all' | 'admin' | 'user'>('all');

	// Reset password modal state
	let selectedUser = $state<UserWithStats | null>(null);
	let newPassword = $state('');
	let showPassword = $state(false);
	let isResetting = $state(false);
	let resetSuccess = $state('');
	let resetError = $state('');

	onMount(() => {
		loadUsers();
	});

	async function loadUsers() {
		isLoading = true;
		error = '';
		try {
			const res = await fetch('/api/admin/users');
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to load user accounts');
			}
			const data = await res.json();
			users = data.users;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to fetch user accounts';
		} finally {
			isLoading = false;
		}
	}

	function generatePassword() {
		const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
		let pass = '';
		for (let i = 0; i < 12; i++) {
			pass += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		newPassword = pass;
		showPassword = true;
	}

	function openResetModal(user: UserWithStats) {
		selectedUser = user;
		newPassword = '';
		resetSuccess = '';
		resetError = '';
		showPassword = false;
	}

	function closeResetModal() {
		selectedUser = null;
		newPassword = '';
		resetSuccess = '';
		resetError = '';
		showPassword = false;
	}

	async function submitPasswordReset(e: Event) {
		e.preventDefault();
		if (!selectedUser) return;

		if (!newPassword || newPassword.length < 6) {
			resetError = 'Password must be at least 6 characters.';
			return;
		}

		isResetting = true;
		resetError = '';
		resetSuccess = '';

		try {
			const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newPassword })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to update user password.');
			}

			resetSuccess = `Password for @${selectedUser.username} successfully updated!`;
			toast.show(`Password reset for @${selectedUser.username}`, 'success');
		} catch (err: unknown) {
			resetError = err instanceof Error ? err.message : 'Error updating password';
		} finally {
			isResetting = false;
		}
	}

	async function copyPassword() {
		if (!newPassword) return;
		try {
			await navigator.clipboard.writeText(newPassword);
			toast.show('Password copied to clipboard', 'info');
		} catch {
			toast.show('Failed to copy to clipboard', 'danger');
		}
	}

	// Filtered users
	let filteredUsers = $derived.by(() => {
		let list = [...users];

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(u) =>
					u.username.toLowerCase().includes(q) ||
					u.displayName.toLowerCase().includes(q)
			);
		}

		if (roleFilter !== 'all') {
			list = list.filter((u) => u.role === roleFilter);
		}

		return list;
	});

	// Metrics
	let totalUsers = $derived(users.length);
	let totalEntries = $derived(users.reduce((acc, u) => acc + (u.entryCount || 0), 0));
	let totalWords = $derived(users.reduce((acc, u) => acc + (u.wordCount || 0), 0));
	let activeWriters = $derived(users.filter((u) => (u.entryCount || 0) > 0).length);
</script>

<div class="admin-container">
	<!-- Admin Header -->
	<div class="admin-hero">
		<div class="hero-left">
			<div class="admin-badge">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
				</svg>
				<span>Admin Console</span>
			</div>
			<h2>User Account Management</h2>
			<p class="hero-desc">
				Manage accounts, inspect activity metrics, and securely reset passwords for users who forgot their credentials.
			</p>
		</div>

		<button class="btn refresh-btn" onclick={loadUsers} disabled={isLoading} title="Refresh accounts list">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={isLoading ? 'spinning' : ''}>
				<polyline points="23 4 23 10 17 10"></polyline>
				<polyline points="1 20 1 14 7 14"></polyline>
				<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
			</svg>
			<span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
		</button>
	</div>

	<!-- System Overview Stats -->
	<div class="metrics-grid">
		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">Total Registered Users</span>
				<span class="metric-icon">👥</span>
			</div>
			<div class="metric-val">{totalUsers}</div>
			<div class="metric-sub">{users.filter(u => u.role === 'admin').length} Admin · {users.filter(u => u.role === 'user').length} Regular Users</div>
		</div>

		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">Total Journal Entries</span>
				<span class="metric-icon">📖</span>
			</div>
			<div class="metric-val">{totalEntries.toLocaleString()}</div>
			<div class="metric-sub">Across all user accounts</div>
		</div>

		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">Total Words Written</span>
				<span class="metric-icon">✍️</span>
			</div>
			<div class="metric-val">{totalWords.toLocaleString()}</div>
			<div class="metric-sub">Stored locally in SQLite</div>
		</div>

		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">Active Writers</span>
				<span class="metric-icon">✨</span>
			</div>
			<div class="metric-val">{activeWriters}</div>
			<div class="metric-sub">{totalUsers > 0 ? Math.round((activeWriters / totalUsers) * 100) : 0}% active engagement</div>
		</div>
	</div>

	<!-- Users Table Section -->
	<div class="card users-card">
		<div class="users-toolbar">
			<div class="search-box">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"></circle>
					<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
				</svg>
				<input
					type="search"
					placeholder="Search users by name or username..."
					bind:value={searchQuery}
					class="search-input"
				/>
				{#if searchQuery}
					<button class="clear-btn" onclick={() => (searchQuery = '')} title="Clear search">✕</button>
				{/if}
			</div>

			<div class="role-filters">
				<button
					type="button"
					class="filter-chip {roleFilter === 'all' ? 'on' : ''}"
					onclick={() => (roleFilter = 'all')}
				>
					All ({users.length})
				</button>
				<button
					type="button"
					class="filter-chip {roleFilter === 'admin' ? 'on' : ''}"
					onclick={() => (roleFilter = 'admin')}
				>
					Admins ({users.filter((u) => u.role === 'admin').length})
				</button>
				<button
					type="button"
					class="filter-chip {roleFilter === 'user' ? 'on' : ''}"
					onclick={() => (roleFilter = 'user')}
				>
					Standard ({users.filter((u) => u.role === 'user').length})
				</button>
			</div>
		</div>

		{#if error}
			<div class="error-banner">
				<span>⚠️ {error}</span>
				<button class="btn small" onclick={loadUsers}>Retry</button>
			</div>
		{/if}

		<!-- Desktop Table -->
		<div class="table-wrap">
			<table class="users-table">
				<thead>
					<tr>
						<th>User Account</th>
						<th>Role</th>
						<th class="text-right">Entries</th>
						<th class="text-right">Words</th>
						<th>Joined</th>
						<th>Last Active</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredUsers as user (user.id)}
						<tr>
							<!-- User Account info -->
							<td>
								<div class="user-identity">
									<div class="user-avatar {user.role}">
										{user.displayName.charAt(0).toUpperCase()}
									</div>
									<div class="user-meta">
										<span class="user-display">{user.displayName}</span>
										<span class="user-handle">@{user.username}</span>
									</div>
								</div>
							</td>

							<!-- Role -->
							<td>
								<span class="role-badge {user.role}">
									{user.role === 'admin' ? '🛡️ Admin' : '👤 User'}
								</span>
							</td>

							<!-- Entries -->
							<td class="text-right">
								<span class="num-highlight">{user.entryCount.toLocaleString()}</span>
							</td>

							<!-- Words -->
							<td class="text-right">
								<span class="num-highlight">{user.wordCount.toLocaleString()}</span>
							</td>

							<!-- Joined -->
							<td>
								<span class="date-txt">{formatDate(user.created)}</span>
							</td>

							<!-- Last Active -->
							<td>
								{#if user.lastActive}
									<span class="date-txt">{formatDate(user.lastActive)}</span>
								{:else}
									<span class="mu" style="font-size: 12px;">No activity</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="text-right">
								<button
									class="btn small reset-btn"
									onclick={() => openResetModal(user)}
									title="Change / reset password for @{user.username}"
								>
									<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
										<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
									</svg>
									<span>Reset Password</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="empty-cell">
								<p>No user accounts matched your search criteria.</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile Card View -->
		<div class="mobile-cards">
			{#each filteredUsers as user (user.id)}
				<div class="mobile-user-card card">
					<div class="mobile-card-top">
						<div class="user-identity">
							<div class="user-avatar {user.role}">
								{user.displayName.charAt(0).toUpperCase()}
							</div>
							<div class="user-meta">
								<span class="user-display">{user.displayName}</span>
								<span class="user-handle">@{user.username}</span>
							</div>
						</div>
						<span class="role-badge {user.role}">
							{user.role === 'admin' ? '🛡️ Admin' : '👤 User'}
						</span>
					</div>

					<div class="mobile-stats-row">
						<div class="m-stat">
							<span class="m-lbl">Entries</span>
							<span class="m-val">{user.entryCount}</span>
						</div>
						<div class="m-stat">
							<span class="m-lbl">Words</span>
							<span class="m-val">{user.wordCount.toLocaleString()}</span>
						</div>
						<div class="m-stat">
							<span class="m-lbl">Joined</span>
							<span class="m-val">{new Date(user.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
						</div>
					</div>

					<div class="mobile-card-footer">
						<button
							class="btn small reset-btn"
							onclick={() => openResetModal(user)}
							style="width: 100%; justify-content: center;"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
								<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
							</svg>
							<span>Reset User Password</span>
						</button>
					</div>
				</div>
			{:else}
				<div class="card empty">
					<p>No user accounts found.</p>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Password Reset Modal Backdrop -->
{#if selectedUser}
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="reset-modal-title"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeResetModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeResetModal();
		}}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div class="modal-card card" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title-row">
					<div class="modal-icon">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
						</svg>
					</div>
					<div>
						<h3 id="reset-modal-title">Reset User Password</h3>
						<span class="mu" style="font-size: 13px;">Admin password override</span>
					</div>
				</div>
				<button class="close-btn" onclick={closeResetModal} aria-label="Close modal">✕</button>
			</div>

			<!-- Target user overview -->
			<div class="target-user-box">
				<div class="user-avatar {selectedUser.role}">
					{selectedUser.displayName.charAt(0).toUpperCase()}
				</div>
				<div class="target-meta">
					<span class="target-name">{selectedUser.displayName}</span>
					<span class="target-handle">@{selectedUser.username} · Role: {selectedUser.role}</span>
				</div>
			</div>

			{#if resetSuccess}
				<div class="success-box">
					<div class="success-icon">✓</div>
					<div class="success-text">
						<p class="success-title">{resetSuccess}</p>
						<p class="success-sub">Share the new password with the user so they can log in.</p>
					</div>
				</div>
			{/if}

			{#if resetError}
				<div class="error-msg">⚠️ {resetError}</div>
			{/if}

			<form onsubmit={submitPasswordReset} class="reset-form">
				<div class="field">
					<div class="field-label-row">
						<label for="new-password">New Password</label>
						<button
							type="button"
							class="text-action-btn"
							onclick={generatePassword}
							title="Generate a secure random password"
						>
							⚡ Generate Strong Password
						</button>
					</div>

					<div class="password-input-wrap">
						<input
							id="new-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={newPassword}
							placeholder="Enter new password (min. 6 chars)"
							required
							minlength="6"
							autocomplete="new-password"
						/>
						<button
							type="button"
							class="pw-toggle-btn"
							onclick={() => (showPassword = !showPassword)}
							title={showPassword ? 'Hide password' : 'Show password'}
						>
							{showPassword ? '🙈' : '👁️'}
						</button>
						{#if newPassword}
							<button
								type="button"
								class="pw-copy-btn"
								onclick={copyPassword}
								title="Copy to clipboard"
							>
								📋
							</button>
						{/if}
					</div>
					<span class="field-hint">User's existing sessions will remain valid or can re-authenticate immediately.</span>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn" onclick={closeResetModal}>
						{resetSuccess ? 'Done' : 'Cancel'}
					</button>
					<button type="submit" class="btn pri" disabled={isResetting || !newPassword}>
						{isResetting ? 'Updating...' : 'Update Password'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.admin-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
		animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.admin-hero {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex-wrap: wrap;
	}

	.admin-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
		color: var(--ac);
		background: rgba(201, 167, 124, 0.12);
		border: 1px solid rgba(201, 167, 124, 0.28);
		padding: 4px 10px;
		border-radius: 999px;
		margin-bottom: 8px;
	}

	.hero-left h2 {
		margin: 0 0 6px 0;
		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.hero-desc {
		margin: 0;
		color: var(--mu);
		font-size: 14px;
		max-width: 640px;
		line-height: 1.5;
	}

	.refresh-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.spinning {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Metrics */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	.metric-card {
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.metric-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.metric-lbl {
		font-size: 11.5px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 600;
		color: var(--mu);
	}

	.metric-icon {
		font-size: 16px;
	}

	.metric-val {
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--tx);
		font-variant-numeric: tabular-nums;
	}

	.metric-sub {
		font-size: 12px;
		color: var(--mu);
	}

	/* Users Card & Toolbar */
	.users-card {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.users-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.search-box {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 260px;
		max-width: 440px;
	}

	.search-box svg {
		position: absolute;
		left: 12px;
		color: var(--mu);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 9px 34px 9px 34px;
		border-radius: 8px;
		border: 1px solid var(--bd);
		background: var(--in);
		color: var(--tx);
		font-size: 13.5px;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--ac);
	}

	.clear-btn {
		position: absolute;
		right: 10px;
		background: transparent;
		border: none;
		color: var(--mu);
		cursor: pointer;
		font-size: 12px;
		padding: 4px;
	}

	.clear-btn:hover {
		color: var(--tx);
	}

	.role-filters {
		display: flex;
		gap: 6px;
	}

	.filter-chip {
		background: transparent;
		border: 1px solid var(--bd);
		color: var(--mu);
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 12.5px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-chip:hover {
		color: var(--tx);
		border-color: rgba(255, 255, 255, 0.25);
	}

	.filter-chip.on {
		background: var(--tx);
		color: var(--bg1);
		border-color: var(--tx);
		font-weight: 600;
	}

	/* Table */
	.table-wrap {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--bd);
		border-radius: 8px;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 13.5px;
	}

	.users-table th {
		background: rgba(0, 0, 0, 0.18);
		color: var(--mu);
		font-size: 11.5px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 12px 16px;
		font-weight: 600;
		border-bottom: 1px solid var(--bd);
		white-space: nowrap;
	}

	.users-table td {
		padding: 14px 16px;
		border-bottom: 1px solid var(--bd);
		vertical-align: middle;
	}

	.users-table tr:last-child td {
		border-bottom: none;
	}

	.users-table tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

	.text-right {
		text-align: right;
	}

	.user-identity {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.user-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 13px;
		flex-shrink: 0;
	}

	.user-avatar.admin {
		background: linear-gradient(135deg, rgba(201, 167, 124, 0.28), rgba(201, 167, 124, 0.5));
		color: var(--ac);
		border: 1px solid rgba(201, 167, 124, 0.5);
	}

	.user-avatar.user {
		background: linear-gradient(135deg, rgba(143, 163, 138, 0.24), rgba(143, 163, 138, 0.45));
		color: var(--ac2);
		border: 1px solid rgba(143, 163, 138, 0.45);
	}

	.user-meta {
		display: flex;
		flex-direction: column;
	}

	.user-display {
		font-weight: 600;
		color: var(--tx);
		line-height: 1.3;
	}

	.user-handle {
		font-size: 12px;
		color: var(--mu);
	}

	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 9px;
		border-radius: 6px;
		font-size: 11.5px;
		font-weight: 600;
	}

	.role-badge.admin {
		background: rgba(201, 167, 124, 0.15);
		color: var(--ac);
		border: 1px solid rgba(201, 167, 124, 0.35);
	}

	.role-badge.user {
		background: rgba(143, 163, 138, 0.15);
		color: var(--ac2);
		border: 1px solid rgba(143, 163, 138, 0.35);
	}

	.num-highlight {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--tx);
	}

	.date-txt {
		font-size: 12.5px;
		color: var(--mu);
		white-space: nowrap;
	}

	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}

	.reset-btn:hover {
		border-color: var(--ac);
		color: var(--ac);
	}

	.empty-cell {
		text-align: center;
		padding: 36px !important;
		color: var(--mu);
	}

	/* Mobile Cards */
	.mobile-cards {
		display: none;
		flex-direction: column;
		gap: 12px;
	}

	.mobile-user-card {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.mobile-card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.mobile-stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		padding: 10px 12px;
		background: var(--in);
		border-radius: 6px;
	}

	.m-stat {
		display: flex;
		flex-direction: column;
	}

	.m-lbl {
		font-size: 10.5px;
		text-transform: uppercase;
		color: var(--mu);
		font-weight: 600;
	}

	.m-val {
		font-size: 13px;
		font-weight: 600;
		color: var(--tx);
	}

	/* Reset Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		z-index: 1000;
		animation: fadeIn 0.15s ease-out;
	}

	.modal-card {
		width: 100%;
		max-width: 480px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 18px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.modal-title-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.modal-icon {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: rgba(201, 167, 124, 0.15);
		color: var(--ac);
		border: 1px solid rgba(201, 167, 124, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-title-row h3 {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--mu);
		font-size: 16px;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
	}

	.close-btn:hover {
		color: var(--tx);
	}

	.target-user-box {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--in);
		border: 1px solid var(--bd);
	}

	.target-meta {
		display: flex;
		flex-direction: column;
	}

	.target-name {
		font-weight: 600;
		color: var(--tx);
	}

	.target-handle {
		font-size: 12px;
		color: var(--mu);
	}

	.success-box {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 14px;
		background: rgba(143, 163, 138, 0.15);
		border: 1px solid rgba(143, 163, 138, 0.35);
		border-radius: 8px;
	}

	.success-icon {
		background: var(--ac2);
		color: #14171c;
		font-weight: 700;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		flex-shrink: 0;
	}

	.success-title {
		margin: 0 0 2px 0;
		font-weight: 600;
		color: var(--ac2);
		font-size: 13.5px;
	}

	.success-sub {
		margin: 0;
		font-size: 12px;
		color: var(--tx);
		opacity: 0.85;
	}

	.error-msg {
		padding: 10px 12px;
		background: rgba(217, 133, 122, 0.12);
		border: 1px solid rgba(217, 133, 122, 0.3);
		color: var(--dg);
		border-radius: 6px;
		font-size: 13px;
	}

	.error-banner {
		padding: 12px;
		border-radius: 8px;
		background: rgba(217, 133, 122, 0.12);
		border: 1px solid rgba(217, 133, 122, 0.3);
		color: var(--dg);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 13px;
	}

	.reset-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.field-label-row label {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--tx);
	}

	.text-action-btn {
		background: transparent;
		border: none;
		color: var(--ac);
		font-size: 11.5px;
		cursor: pointer;
		font-weight: 600;
		padding: 0;
	}

	.text-action-btn:hover {
		text-decoration: underline;
	}

	.password-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.password-input-wrap input {
		width: 100%;
		padding: 10px 72px 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--bd);
		background: var(--in);
		color: var(--tx);
		font-size: 14px;
		font-family: inherit;
		outline: none;
	}

	.password-input-wrap input:focus {
		border-color: var(--ac);
	}

	.pw-toggle-btn {
		position: absolute;
		right: 36px;
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 14px;
		padding: 4px;
	}

	.pw-copy-btn {
		position: absolute;
		right: 10px;
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 14px;
		padding: 4px;
	}

	.field-hint {
		font-size: 11.5px;
		color: var(--mu);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 8px;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.table-wrap {
			display: none;
		}

		.mobile-cards {
			display: flex;
		}

		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.hero-left h2 {
			font-size: 20px;
		}

		.search-box {
			max-width: 100%;
		}

		.users-toolbar {
			flex-direction: column;
			align-items: stretch;
		}

		.role-filters {
			overflow-x: auto;
			padding-bottom: 4px;
		}
	}
</style>
