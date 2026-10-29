<script lang="ts">
	import { onMount } from 'svelte';
	import type { User } from '#lib/types';

	interface Props {
		currentView: 'home' | 'feed' | 'cal' | 'trash' | 'admin';
		trashCount: number;
		user: User | null;
		onSelectView: (view: 'home' | 'feed' | 'cal' | 'trash' | 'admin') => void;
		onNewEntry: () => void;
		onLogout?: () => void;
	}

	let { currentView, trashCount, user, onSelectView, onNewEntry, onLogout }: Props = $props();

	let isDark = $state(true);
	let todayString = $state('');

	onMount(() => {
		todayString = new Date().toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});

		// Check saved theme or system preference
		const savedTheme = localStorage.getItem('journal_theme');
		if (savedTheme) {
			isDark = savedTheme === 'dark';
		} else {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		applyTheme();
	});

	function toggleTheme() {
		isDark = !isDark;
		localStorage.setItem('journal_theme', isDark ? 'dark' : 'light');
		applyTheme();
	}

	function applyTheme() {
		if (typeof document !== 'undefined') {
			document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
		}
	}
</script>

<header class="app-header">
	<div class="brand-section">
		<h1>
			Journal
			<span class="live-date">· {todayString}</span>
		</h1>
	</div>

	<nav class="nav-tabs" aria-label="Main navigation">
		<button
			class="tab {currentView === 'home' ? 'on' : ''}"
			onclick={() => onSelectView('home')}
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="7" height="7"></rect>
				<rect x="14" y="3" width="7" height="7"></rect>
				<rect x="14" y="14" width="7" height="7"></rect>
				<rect x="3" y="14" width="7" height="7"></rect>
			</svg>
			<span>Dashboard</span>
		</button>
		<button
			class="tab {currentView === 'feed' ? 'on' : ''}"
			onclick={() => onSelectView('feed')}
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="8" y1="6" x2="21" y2="6"></line>
				<line x1="8" y1="12" x2="21" y2="12"></line>
				<line x1="8" y1="18" x2="21" y2="18"></line>
				<line x1="3" y1="6" x2="3.01" y2="6"></line>
				<line x1="3" y1="12" x2="3.01" y2="12"></line>
				<line x1="3" y1="18" x2="3.01" y2="18"></line>
			</svg>
			<span>Entries</span>
		</button>
		<button
			class="tab {currentView === 'cal' ? 'on' : ''}"
			onclick={() => onSelectView('cal')}
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
				<line x1="16" y1="2" x2="16" y2="6"></line>
				<line x1="8" y1="2" x2="8" y2="6"></line>
				<line x1="3" y1="10" x2="21" y2="10"></line>
			</svg>
			<span>Calendar</span>
		</button>
		<button
			class="tab {currentView === 'trash' ? 'on' : ''}"
			onclick={() => onSelectView('trash')}
		>
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="3 6 5 6 21 6"></polyline>
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
			</svg>
			<span>Trash</span>
			{#if trashCount > 0}
				<span class="tab-badge">{trashCount}</span>
			{/if}
		</button>

		{#if user?.role === 'admin'}
			<button
				class="tab admin-tab {currentView === 'admin' ? 'on' : ''}"
				onclick={() => onSelectView('admin')}
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
				</svg>
				<span>Admin</span>
			</button>
		{/if}
	</nav>

	<div class="header-actions">
		<button class="btn pri new-entry-btn" onclick={onNewEntry} title="Create a new entry">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19"></line>
				<line x1="5" y1="12" x2="19" y2="12"></line>
			</svg>
			<span class="btn-text">New Entry</span>
		</button>

		<button class="btn icon-only theme-btn" onclick={toggleTheme} title="Toggle Dark / Light Theme" aria-label="Toggle theme">
			{#if isDark}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="5"></circle>
					<line x1="12" y1="1" x2="12" y2="3"></line>
					<line x1="12" y1="21" x2="12" y2="23"></line>
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
					<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
					<line x1="1" y1="12" x2="3" y2="12"></line>
					<line x1="21" y1="12" x2="23" y2="12"></line>
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
					<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
				</svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
				</svg>
			{/if}
		</button>

		{#if user}
			<div class="user-pill" title="Signed in as {user.displayName} (@{user.username})">
				<span class="user-avatar-mini {user.role}">{user.displayName.charAt(0).toUpperCase()}</span>
				<span class="user-pill-name">{user.displayName}</span>
				{#if user.role === 'admin'}
					<span class="admin-badge-mini">Admin</span>
				{/if}
			</div>

			{#if onLogout}
				<button class="btn icon-only logout-btn" onclick={onLogout} title="Sign Out (@{user.username})" aria-label="Sign out">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
						<polyline points="16 17 21 12 16 7"></polyline>
						<line x1="21" y1="12" x2="9" y2="12"></line>
					</svg>
				</button>
			{/if}
		{/if}
	</div>
</header>

<style>
	.app-header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 20px;
		margin-bottom: 24px;
		padding-bottom: 18px;
		border-bottom: 1px solid var(--bd);
	}

	.app-header nav.nav-tabs {
		justify-self: center;
	}

	.admin-tab.on {
		color: var(--ac);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-self: end;
	}

	.user-pill {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px 4px 5px;
		border-radius: 999px;
		background: var(--card);
		border: 1px solid var(--bd);
		font-size: 13px;
	}

	.user-avatar-mini {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 11px;
	}

	.user-avatar-mini.admin {
		background: linear-gradient(135deg, rgba(201, 167, 124, 0.3), rgba(201, 167, 124, 0.6));
		color: var(--ac);
		border: 1px solid rgba(201, 167, 124, 0.4);
	}

	.user-avatar-mini.user {
		background: linear-gradient(135deg, rgba(143, 163, 138, 0.3), rgba(143, 163, 138, 0.6));
		color: var(--ac2);
		border: 1px solid rgba(143, 163, 138, 0.4);
	}

	.user-pill-name {
		font-weight: 600;
		color: var(--tx);
		max-width: 110px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.admin-badge-mini {
		font-size: 10px;
		text-transform: uppercase;
		font-weight: 700;
		letter-spacing: 0.04em;
		background: rgba(201, 167, 124, 0.2);
		color: var(--ac);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.logout-btn:hover {
		color: var(--dg);
		border-color: rgba(217, 133, 122, 0.4);
	}

	@media (max-width: 1140px) {
		.app-header {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			margin-bottom: 18px;
			padding-bottom: 14px;
		}

		.app-header nav.nav-tabs {
			order: 3;
			width: 100%;
			justify-content: space-between;
			overflow-x: auto;
		}
	}

	@media (max-width: 640px) {
		.user-pill-name {
			display: none;
		}
		.user-pill {
			padding: 4px;
		}
	}

	@media (max-width: 520px) {
		.btn-text {
			display: none;
		}
		.new-entry-btn {
			padding: 8px 12px;
		}
	}
</style>

