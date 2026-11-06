<script lang="ts">
	import { onMount } from 'svelte';
	import type { User, UserWithStats, UserRole } from '#lib/types';
	import { formatDate } from '#lib/utils/markdown';
	import { toast } from '#lib/utils/toast.svelte';
	import ConfirmationModal from './ConfirmationModal.svelte';

	interface Props {
		currentUser?: User | null;
	}

	let { currentUser }: Props = $props();

	let users = $state<UserWithStats[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let searchQuery = $state('');
	let roleFilter = $state<'all' | 'admin' | 'user'>('all');

	// Create User Modal state
	let showCreateModal = $state(false);
	let createUsername = $state('');
	let createDisplayName = $state('');
	let createPassword = $state('');
	let createRole = $state<UserRole>('user');
	let showCreatePassword = $state(false);
	let isCreating = $state(false);
	let createError = $state('');

	// Edit User Modal state
	let editingUser = $state<UserWithStats | null>(null);
	let editDisplayName = $state('');
	let editRole = $state<UserRole>('user');
	let isUpdating = $state(false);
	let editError = $state('');

	// Reset Password Modal state
	let selectedUser = $state<UserWithStats | null>(null);
	let newPassword = $state('');
	let showPassword = $state(false);
	let isResetting = $state(false);
	let resetSuccess = $state('');
	let resetError = $state('');

	// Confirmation Modal state
	let confirmState = $state<{
		open: boolean;
		title: string;
		message: string;
		confirmText: string;
		cancelText?: string;
		variant: 'danger' | 'warning' | 'primary';
		isLoading: boolean;
		action: () => Promise<void>;
	}>({
		open: false,
		title: '',
		message: '',
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		variant: 'danger',
		isLoading: false,
		action: async () => {}
	});

	function promptConfirm(opts: {
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'primary';
		action: () => Promise<void>;
	}) {
		confirmState = {
			open: true,
			title: opts.title,
			message: opts.message,
			confirmText: opts.confirmText || 'Confirm',
			cancelText: opts.cancelText || 'Cancel',
			variant: opts.variant || 'danger',
			isLoading: false,
			action: opts.action
		};
	}

	function closeConfirm() {
		if (confirmState.isLoading) return;
		confirmState.open = false;
	}

	async function runConfirmAction() {
		confirmState.isLoading = true;
		try {
			await confirmState.action();
		} finally {
			confirmState.isLoading = false;
			confirmState.open = false;
		}
	}

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

	function generateRandomPassword(): string {
		const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
		let pass = '';
		for (let i = 0; i < 12; i++) {
			pass += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return pass;
	}

	// --- CREATE USER ---
	function openCreateModal() {
		createUsername = '';
		createDisplayName = '';
		createPassword = generateRandomPassword();
		createRole = 'user';
		showCreatePassword = true;
		createError = '';
		showCreateModal = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
		createError = '';
	}

	async function submitCreateUser(e: Event) {
		e.preventDefault();
		createError = '';

		const cleanUsername = createUsername.trim().toLowerCase();
		if (!cleanUsername || cleanUsername.length < 3) {
			createError = 'Username must be at least 3 characters.';
			return;
		}

		if (!createPassword || createPassword.length < 6) {
			createError = 'Password must be at least 6 characters.';
			return;
		}

		isCreating = true;
		try {
			const res = await fetch('/api/admin/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: cleanUsername,
					displayName: createDisplayName.trim() || cleanUsername,
					password: createPassword,
					role: createRole
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to create user account');
			}

			toast.show(`Account @${cleanUsername} created successfully!`, 'success');
			closeCreateModal();
			await loadUsers();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Failed to create user account';
		} finally {
			isCreating = false;
		}
	}

	// --- EDIT USER ---
	function openEditModal(user: UserWithStats) {
		editingUser = user;
		editDisplayName = user.displayName;
		editRole = user.role;
		editError = '';
	}

	function closeEditModal() {
		editingUser = null;
		editError = '';
	}

	async function submitEditUser(e: Event) {
		e.preventDefault();
		if (!editingUser) return;

		editError = '';
		isUpdating = true;

		try {
			const res = await fetch(`/api/admin/users/${editingUser.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: editDisplayName.trim() || editingUser.username,
					role: editRole
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to update user account');
			}

			toast.show(`Account @${editingUser.username} updated!`, 'success');
			closeEditModal();
			await loadUsers();
		} catch (err: unknown) {
			editError = err instanceof Error ? err.message : 'Failed to update user';
		} finally {
			isUpdating = false;
		}
	}

	// --- DELETE USER ---
	function promptDeleteUser(user: UserWithStats) {
		if (currentUser && user.id === currentUser.id) {
			toast.show('You cannot delete your own account.', 'danger');
			return;
		}

		promptConfirm({
			title: `Delete Account @${user.username}?`,
			message: `Are you sure you want to permanently delete the account for @${user.username} (${user.displayName})? All login sessions and account records will be removed. This action cannot be undone.`,
			confirmText: 'Delete Account',
			variant: 'danger',
			action: async () => {
				const res = await fetch(`/api/admin/users/${user.id}`, {
					method: 'DELETE'
				});

				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || 'Failed to delete user');
				}

				toast.show(`Account @${user.username} has been deleted`, 'danger');
				await loadUsers();
			}
		});
	}

	// --- QUICK ROLE CHANGE ---
	function promptToggleRole(user: UserWithStats) {
		if (currentUser && user.id === currentUser.id) {
			toast.show('You cannot modify your own role.', 'danger');
			return;
		}

		const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
		const isPromoting = newRole === 'admin';

		promptConfirm({
			title: isPromoting ? `Promote @${user.username} to Admin?` : `Demote @${user.username} to User?`,
			message: isPromoting
				? `Grant Administrator privileges to @${user.username} (${user.displayName})? They will have full access to manage accounts and system settings.`
				: `Demote @${user.username} (${user.displayName}) to Standard User? They will lose access to the Admin Console.`,
			confirmText: isPromoting ? 'Promote to Admin' : 'Demote to User',
			variant: isPromoting ? 'warning' : 'danger',
			action: async () => {
				const res = await fetch(`/api/admin/users/${user.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ role: newRole })
				});

				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || 'Failed to update role');
				}

				toast.show(`Role for @${user.username} changed to ${newRole}`, 'success');
				await loadUsers();
			}
		});
	}

	// --- RESET PASSWORD ---
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

	function generatePassword() {
		newPassword = generateRandomPassword();
		showPassword = true;
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

	async function copyPassword(text: string) {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
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

	// Account-focused Metrics (strict privacy: only account data, no journal contents)
	let totalUsers = $derived(users.length);
	let adminCount = $derived(users.filter((u) => u.role === 'admin').length);
	let standardCount = $derived(users.filter((u) => u.role === 'user').length);
	let recentActiveCount = $derived(
		users.filter((u) => u.lastActive && Date.now() - u.lastActive < 30 * 864e5).length
	);
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
				Manage user accounts, configure role permissions, provision new accounts, and securely reset account credentials.
			</p>
		</div>

		<div class="hero-actions">
			<button class="btn" onclick={loadUsers} disabled={isLoading} title="Refresh accounts list">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={isLoading ? 'spinning' : ''}>
					<polyline points="23 4 23 10 17 10"></polyline>
					<polyline points="1 20 1 14 7 14"></polyline>
					<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
				</svg>
				<span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
			</button>

			<button class="btn pri add-user-btn" onclick={openCreateModal} title="Create a new user account">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="5" x2="12" y2="19"></line>
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
				<span>Add New User</span>
			</button>
		</div>
	</div>

	<!-- Account Overview Stats (Focusing strictly on account info & details) -->
	<div class="metrics-grid">
		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">Total Registered Accounts</span>
				<span class="metric-icon">👥</span>
			</div>
			<div class="metric-val">{totalUsers}</div>
			<div class="metric-sub">Registered in SQLite database</div>
		</div>

		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">System Administrators</span>
				<span class="metric-icon">🛡️</span>
			</div>
			<div class="metric-val">{adminCount}</div>
			<div class="metric-sub">Privileged management accounts</div>
		</div>

		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">Standard User Accounts</span>
				<span class="metric-icon">👤</span>
			</div>
			<div class="metric-val">{standardCount}</div>
			<div class="metric-sub">Personal journal accounts</div>
		</div>

		<div class="card metric-card">
			<div class="metric-top">
				<span class="metric-lbl">Active Accounts</span>
				<span class="metric-icon">✨</span>
			</div>
			<div class="metric-val">{recentActiveCount}</div>
			<div class="metric-sub">Active within last 30 days</div>
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
					placeholder="Search accounts by name or username..."
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
					All Accounts ({users.length})
				</button>
				<button
					type="button"
					class="filter-chip {roleFilter === 'admin' ? 'on' : ''}"
					onclick={() => (roleFilter = 'admin')}
				>
					Administrators ({adminCount})
				</button>
				<button
					type="button"
					class="filter-chip {roleFilter === 'user' ? 'on' : ''}"
					onclick={() => (roleFilter = 'user')}
				>
					Standard Users ({standardCount})
				</button>
			</div>
		</div>

		{#if error}
			<div class="error-banner">
				<span>⚠️ {error}</span>
				<button class="btn small" onclick={loadUsers}>Retry</button>
			</div>
		{/if}

		<!-- Desktop Table (Account details only: Account, Role, Status, Joined, Last Active, Actions) -->
		<div class="table-wrap">
			<table class="users-table">
				<thead>
					<tr>
						<th>Account Details</th>
						<th>Role</th>
						<th>Account Status</th>
						<th>Account ID</th>
						<th>Joined Date</th>
						<th>Last Active</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredUsers as user (user.id)}
						{@const isSelf = currentUser?.id === user.id}
						<tr class={isSelf ? 'self-row' : ''}>
							<!-- Account Info -->
							<td>
								<div class="user-identity">
									<div class="user-avatar {user.role}">
										{user.displayName.charAt(0).toUpperCase()}
									</div>
									<div class="user-meta">
										<div class="user-name-line">
											<span class="user-display">{user.displayName}</span>
											{#if isSelf}
												<span class="you-badge" title="This is your logged-in account">You</span>
											{/if}
										</div>
										<span class="user-handle">@{user.username}</span>
									</div>
								</div>
							</td>

							<!-- Role badge & quick toggle -->
							<td>
								<div class="role-cell">
									<span class="role-badge {user.role}">
										{user.role === 'admin' ? '🛡️ Admin' : '👤 User'}
									</span>
									{#if !isSelf}
										<button
											class="role-toggle-btn"
											onclick={() => promptToggleRole(user)}
											title={user.role === 'admin' ? 'Demote to Standard User' : 'Promote to Administrator'}
										>
											{user.role === 'admin' ? 'Demote' : 'Promote'}
										</button>
									{/if}
								</div>
							</td>

							<!-- Account Status -->
							<td>
								<span class="status-badge active">
									<span class="status-dot"></span>
									Active
								</span>
							</td>

							<!-- Account ID -->
							<td>
								<span class="account-id-txt" title={user.id}>
									{user.id.slice(0, 8)}...
								</span>
							</td>

							<!-- Joined Date -->
							<td>
								<span class="date-txt">{formatDate(user.created)}</span>
							</td>

							<!-- Last Active / Updated -->
							<td>
								{#if user.lastActive}
									<span class="date-txt">{formatDate(user.lastActive)}</span>
								{:else}
									<span class="mu" style="font-size: 12px;">No activity</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="text-right">
								<div class="table-actions">
									<button
										class="btn small action-btn"
										onclick={() => openEditModal(user)}
										title="Edit account details for @{user.username}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
											<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
										</svg>
										<span>Edit</span>
									</button>

									<button
										class="btn small action-btn reset-btn"
										onclick={() => openResetModal(user)}
										title="Reset password for @{user.username}"
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
											<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
										</svg>
										<span>Reset PW</span>
									</button>

									<button
										class="btn small dg action-btn del-btn"
										onclick={() => promptDeleteUser(user)}
										disabled={isSelf}
										title={isSelf ? 'You cannot delete your own account' : `Delete account @${user.username}`}
									>
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="3 6 5 6 21 6"></polyline>
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
										</svg>
										<span>Delete</span>
									</button>
								</div>
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

		<!-- Mobile Card View (Account details only) -->
		<div class="mobile-cards">
			{#each filteredUsers as user (user.id)}
				{@const isSelf = currentUser?.id === user.id}
				<div class="mobile-user-card card {isSelf ? 'self-card' : ''}">
					<div class="mobile-card-top">
						<div class="user-identity">
							<div class="user-avatar {user.role}">
								{user.displayName.charAt(0).toUpperCase()}
							</div>
							<div class="user-meta">
								<div class="user-name-line">
									<span class="user-display">{user.displayName}</span>
									{#if isSelf}
										<span class="you-badge">You</span>
									{/if}
								</div>
								<span class="user-handle">@{user.username}</span>
							</div>
						</div>
						<div class="role-cell">
							<span class="role-badge {user.role}">
								{user.role === 'admin' ? '🛡️ Admin' : '👤 User'}
							</span>
						</div>
					</div>

					<div class="mobile-stats-row">
						<div class="m-stat">
							<span class="m-lbl">Status</span>
							<span class="m-val" style="color: var(--ac2);">● Active</span>
						</div>
						<div class="m-stat">
							<span class="m-lbl">Role</span>
							<span class="m-val">{user.role === 'admin' ? 'Administrator' : 'Standard'}</span>
						</div>
						<div class="m-stat">
							<span class="m-lbl">Joined</span>
							<span class="m-val">{new Date(user.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
						</div>
					</div>

					<div class="mobile-card-footer">
						<button
							class="btn small"
							onclick={() => openEditModal(user)}
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
							<span>Edit</span>
						</button>

						<button
							class="btn small reset-btn"
							onclick={() => openResetModal(user)}
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
								<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
							</svg>
							<span>Reset PW</span>
						</button>

						{#if !isSelf}
							<button
								class="btn small dg"
								onclick={() => promptDeleteUser(user)}
							>
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								</svg>
								<span>Delete</span>
							</button>
						{/if}
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

<!-- ================= CREATE USER MODAL ================= -->
{#if showCreateModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-modal-title"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget && !isCreating) closeCreateModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape' && !isCreating) closeCreateModal();
		}}
	>
		<div class="modal-card card" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title-row">
					<div class="modal-icon user-icon">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
							<circle cx="8.5" cy="7" r="4"></circle>
							<line x1="20" y1="8" x2="20" y2="14"></line>
							<line x1="23" y1="11" x2="17" y2="11"></line>
						</svg>
					</div>
					<div>
						<h3 id="create-modal-title">Create New User Account</h3>
						<span class="mu" style="font-size: 13px;">Provision an account directly from the admin panel</span>
					</div>
				</div>
				<button class="close-btn" onclick={closeCreateModal} aria-label="Close modal" disabled={isCreating}>✕</button>
			</div>

			{#if createError}
				<div class="error-msg">⚠️ {createError}</div>
			{/if}

			<form onsubmit={submitCreateUser} class="modal-form">
				<div class="field">
					<label for="create-username">Username or Email <span class="req">*</span></label>
					<input
						id="create-username"
						type="text"
						bind:value={createUsername}
						placeholder="e.g. sarah_chen or sarah@example.com"
						required
						minlength="3"
						pattern="[a-zA-Z0-9._@+\\-]+"
						title="Letters, numbers, and . _ @ + - characters"
						autocomplete="off"
					/>
					<span class="field-hint">Used for sign-in. Letters, numbers, and . _ @ + - characters.</span>
				</div>

				<div class="field">
					<label for="create-display-name">Display Name</label>
					<input
						id="create-display-name"
						type="text"
						bind:value={createDisplayName}
						placeholder="e.g. Sarah Chen"
						autocomplete="off"
					/>
					<span class="field-hint">The friendly account name displayed throughout the system.</span>
				</div>

				<div class="field">
					<div class="field-label-row">
						<label for="create-password">Initial Password <span class="req">*</span></label>
						<button
							type="button"
							class="text-action-btn"
							onclick={() => {
								createPassword = generateRandomPassword();
								showCreatePassword = true;
							}}
							title="Generate strong random password"
						>
							⚡ Generate Random
						</button>
					</div>

					<div class="password-input-wrap">
						<input
							id="create-password"
							type={showCreatePassword ? 'text' : 'password'}
							bind:value={createPassword}
							placeholder="Min. 6 characters"
							required
							minlength="6"
							autocomplete="new-password"
						/>
						<button
							type="button"
							class="pw-toggle-btn"
							onclick={() => (showCreatePassword = !showCreatePassword)}
							title={showCreatePassword ? 'Hide password' : 'Show password'}
						>
							{showCreatePassword ? '🙈' : '👁️'}
						</button>
						{#if createPassword}
							<button
								type="button"
								class="pw-copy-btn"
								onclick={() => copyPassword(createPassword)}
								title="Copy to clipboard"
							>
								📋
							</button>
						{/if}
					</div>
					<span class="field-hint">Provide this initial password to the user to enable account login.</span>
				</div>

				<div class="field">
					<label for="create-role">Account Role</label>
					<select id="create-role" bind:value={createRole} class="select-input">
						<option value="user">👤 Standard User (Personal Journal)</option>
						<option value="admin">🛡️ Administrator (Full Console Access)</option>
					</select>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn" onclick={closeCreateModal} disabled={isCreating}>
						Cancel
					</button>
					<button type="submit" class="btn pri" disabled={isCreating || !createUsername || !createPassword}>
						{isCreating ? 'Creating Account...' : 'Create Account'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ================= EDIT USER MODAL ================= -->
{#if editingUser}
	{@const isEditingSelf = currentUser?.id === editingUser.id}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-modal-title"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget && !isUpdating) closeEditModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape' && !isUpdating) closeEditModal();
		}}
	>
		<div class="modal-card card" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title-row">
					<div class="modal-icon edit-icon">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
						</svg>
					</div>
					<div>
						<h3 id="edit-modal-title">Edit Account Details</h3>
						<span class="mu" style="font-size: 13px;">Update profile details and role permissions</span>
					</div>
				</div>
				<button class="close-btn" onclick={closeEditModal} aria-label="Close modal" disabled={isUpdating}>✕</button>
			</div>

			<!-- User overview -->
			<div class="target-user-box">
				<div class="user-avatar {editingUser.role}">
					{editingUser.displayName.charAt(0).toUpperCase()}
				</div>
				<div class="target-meta">
					<span class="target-name">{editingUser.displayName}</span>
					<span class="target-handle">@{editingUser.username} · Joined {formatDate(editingUser.created)}</span>
				</div>
			</div>

			{#if editError}
				<div class="error-msg">⚠️ {editError}</div>
			{/if}

			<form onsubmit={submitEditUser} class="modal-form">
				<div class="field">
					<label for="edit-display-name">Display Name</label>
					<input
						id="edit-display-name"
						type="text"
						bind:value={editDisplayName}
						placeholder="Display Name"
						required
					/>
				</div>

				<div class="field">
					<label for="edit-role">Role Permissions</label>
					<select
						id="edit-role"
						bind:value={editRole}
						class="select-input"
						disabled={isEditingSelf}
					>
						<option value="user">👤 Standard User</option>
						<option value="admin">🛡️ Administrator</option>
					</select>
					{#if isEditingSelf}
						<span class="field-hint" style="color: var(--ac);">
							🔒 You cannot modify your own role permissions to prevent accidental lockout.
						</span>
					{/if}
				</div>

				<div class="modal-actions">
					<button type="button" class="btn" onclick={closeEditModal} disabled={isUpdating}>
						Cancel
					</button>
					<button type="submit" class="btn pri" disabled={isUpdating || !editDisplayName}>
						{isUpdating ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ================= RESET PASSWORD MODAL ================= -->
{#if selectedUser}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="reset-modal-title"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget && !isResetting) closeResetModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape' && !isResetting) closeResetModal();
		}}
	>
		<div class="modal-card card" onclick={(e) => e.stopPropagation()}>
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
				<button class="close-btn" onclick={closeResetModal} aria-label="Close modal" disabled={isResetting}>✕</button>
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

			<form onsubmit={submitPasswordReset} class="modal-form">
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
								onclick={() => copyPassword(newPassword)}
								title="Copy to clipboard"
							>
								📋
							</button>
						{/if}
					</div>
					<span class="field-hint">The user can change this password after signing in.</span>
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

<!-- Reusable Confirmation Modal for Admin Actions (e.g. Delete, Role changes) -->
<ConfirmationModal
	open={confirmState.open}
	title={confirmState.title}
	message={confirmState.message}
	confirmText={confirmState.confirmText}
	cancelText={confirmState.cancelText}
	variant={confirmState.variant}
	isLoading={confirmState.isLoading}
	onConfirm={runConfirmAction}
	onCancel={closeConfirm}
/>

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

	.hero-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
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

	.self-row td {
		background: rgba(201, 167, 124, 0.03);
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
		width: 36px;
		height: 36px;
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

	.user-name-line {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.user-display {
		font-weight: 600;
		color: var(--tx);
		line-height: 1.3;
	}

	.you-badge {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		background: var(--ac);
		color: #1a1612;
		padding: 1px 6px;
		border-radius: 999px;
	}

	.user-handle {
		font-size: 12px;
		color: var(--mu);
	}

	.role-cell {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 9px;
		border-radius: 6px;
		font-size: 11.5px;
		font-weight: 600;
		white-space: nowrap;
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

	.role-toggle-btn {
		background: transparent;
		border: 1px solid var(--bd);
		color: var(--mu);
		font-size: 11px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.role-toggle-btn:hover {
		color: var(--tx);
		border-color: var(--ac);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 500;
		color: var(--tx);
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--ac2);
		box-shadow: 0 0 8px var(--ac2);
	}

	.account-id-txt {
		font-family: monospace;
		font-size: 12px;
		color: var(--mu);
		background: var(--in);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--bd);
	}

	.date-txt {
		font-size: 12.5px;
		color: var(--mu);
		white-space: nowrap;
	}

	.table-actions {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		justify-content: flex-end;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		white-space: nowrap;
		padding: 5px 10px;
		font-size: 12px;
	}

	.action-btn:hover {
		border-color: var(--ac);
		color: var(--ac);
	}

	.del-btn:hover {
		border-color: var(--dg) !important;
		color: #ffffff !important;
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
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.self-card {
		border-color: rgba(201, 167, 124, 0.4);
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

	.mobile-card-footer {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.mobile-card-footer .btn {
		justify-content: center;
		width: 100%;
	}

	/* Modal Components */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
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
		background: var(--card-solid);
		border: 1px solid var(--bd-strong);
		border-radius: 18px;
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
		width: 38px;
		height: 38px;
		border-radius: 10px;
		background: rgba(201, 167, 124, 0.15);
		color: var(--ac);
		border: 1px solid rgba(201, 167, 124, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.modal-icon.user-icon {
		background: rgba(138, 163, 133, 0.15);
		color: var(--ac2);
		border-color: rgba(138, 163, 133, 0.3);
	}

	.modal-icon.edit-icon {
		background: rgba(201, 167, 124, 0.15);
		color: var(--ac);
		border-color: rgba(201, 167, 124, 0.3);
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

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field label {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--tx);
	}

	.req {
		color: var(--dg);
	}

	.field input,
	.select-input {
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--bd);
		background: var(--in);
		color: var(--tx);
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.field input:focus,
	.select-input:focus {
		border-color: var(--ac);
	}

	.select-input {
		cursor: pointer;
	}

	.select-input option {
		background: var(--card-solid);
		color: var(--tx);
	}

	.field-label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
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
