<script lang="ts">
	import type { PageData } from './$types';
	import type { JournalEntry, MoodType, JournalStats, User } from '#lib/types';
	import { MOODS } from '#lib/types';
	import { formatDate, stripMarkdown } from '#lib/utils/markdown';
	import { toast } from '#lib/utils/toast.svelte';

	import Header from '#lib/components/Header.svelte';
	import Composer from '#lib/components/Composer.svelte';
	import MoodChart from '#lib/components/MoodChart.svelte';
	import OnThisDay from '#lib/components/OnThisDay.svelte';
	import EntryCard from '#lib/components/EntryCard.svelte';
	import CalendarView from '#lib/components/CalendarView.svelte';
	import DetailModal from '#lib/components/DetailModal.svelte';
	import AuthModal from '#lib/components/AuthModal.svelte';
	import AdminPanel from '#lib/components/AdminPanel.svelte';
	import Toast from '#lib/components/Toast.svelte';

	let { data }: { data: PageData } = $props();

	// Auth & User State
	let currentUser = $state<User | null>(null);

	// Main state
	let currentView = $state<'home' | 'feed' | 'cal' | 'trash' | 'admin'>('home');
	let entries = $state<JournalEntry[]>([]);
	let trashEntries = $state<JournalEntry[]>([]);
	let stats = $state<JournalStats>({
		totalEntries: 0,
		totalWords: 0,
		activeDays: 0,
		mostFrequentMood: null,
		last7Days: []
	});
	let tags = $state<Array<{ tag: string; count: number }>>([]);
	let onThisDay = $state<JournalEntry | null>(null);

	$effect(() => {
		if (data.user !== undefined) currentUser = data.user;
		if (data.initialEntries) entries = data.initialEntries;
		if (data.stats) stats = data.stats;
		if (data.tags) tags = data.tags;
		if (data.onThisDay !== undefined) onThisDay = data.onThisDay;
	});

	// Filters
	let searchQuery = $state('');
	let selectedMood = $state<MoodType | ''>('');
	let selectedTag = $state('');
	let selectedDay = $state('');
	let sortOrder = $state<'newest' | 'oldest'>('newest');

	// Modal state
	let activeEntry = $state<JournalEntry | null>(null);

	// Initial fetch for trash count & sync
	async function refreshData(view?: 'active' | 'trash' | 'all') {
		if (!currentUser) return;
		try {
			// Fetch active entries & stats
			const res = await fetch('/api/entries?view=active');
			if (res.ok) {
				const json = await res.json();
				entries = json.entries;
				stats = json.stats;
				tags = json.tags;
				onThisDay = json.onThisDay;
			}

			// Fetch trash count & items
			const trashRes = await fetch('/api/entries?view=trash');
			if (trashRes.ok) {
				const trashJson = await trashRes.json();
				trashEntries = trashJson.entries;
			}
		} catch (err) {
			console.error('Failed to sync entries with SQLite:', err);
		}
	}

	function handleAuthSuccess(user: User) {
		currentUser = user;
		currentView = 'home';
		refreshData();
	}

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			currentUser = null;
			entries = [];
			trashEntries = [];
			stats = {
				totalEntries: 0,
				totalWords: 0,
				activeDays: 0,
				mostFrequentMood: null,
				last7Days: []
			};
			tags = [];
			onThisDay = null;
			currentView = 'home';
			toast.show('Signed out successfully.', 'info');
		} catch (err) {
			console.error('Logout error:', err);
		}
	}

	// Filtered entries for Feed
	let filteredEntries = $derived.by(() => {
		let list = [...entries];

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(e) =>
					e.title.toLowerCase().includes(q) ||
					e.content.toLowerCase().includes(q) ||
					e.tags.some((t) => t.toLowerCase().includes(q))
			);
		}

		if (selectedMood) {
			list = list.filter((e) => e.mood === selectedMood);
		}

		if (selectedTag) {
			list = list.filter((e) => e.tags.includes(selectedTag));
		}

		if (selectedDay) {
			list = list.filter((e) => {
				const d = new Date(e.created);
				return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === selectedDay;
			});
		}

		if (sortOrder === 'oldest') {
			list.sort((a, b) => a.created - b.created);
		} else {
			list.sort((a, b) => b.created - a.created);
		}

		return list;
	});

	// Actions
	async function handleSaveEntry(entryData: {
		id?: string;
		title: string;
		content: string;
		mood: MoodType;
		tags: string[];
	}) {
		if (entryData.id) {
			// Update existing
			const res = await fetch(`/api/entries/${entryData.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(entryData)
			});
			if (res.ok) {
				const json = await res.json();
				activeEntry = json.entry;
				await refreshData();
				toast.show('Entry updated successfully', 'success');
			} else {
				toast.show('Failed to update entry', 'danger');
			}
		} else {
			// Create new
			const res = await fetch('/api/entries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(entryData)
			});
			if (res.ok) {
				const json = await res.json();
				await refreshData();
				toast.show('New entry saved to SQLite', 'success');
			} else {
				toast.show('Failed to save entry', 'danger');
			}
		}
	}

	async function handleTrash(id: string) {
		const res = await fetch(`/api/entries/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'trash' })
		});
		if (res.ok) {
			activeEntry = null;
			await refreshData();
			toast.show('Entry moved to trash', 'info');
		} else {
			toast.show('Failed to move to trash', 'danger');
		}
	}

	async function handleRestore(id: string) {
		const res = await fetch(`/api/entries/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'restore' })
		});
		if (res.ok) {
			activeEntry = null;
			await refreshData();
			toast.show('Entry restored to journal', 'success');
		} else {
			toast.show('Failed to restore entry', 'danger');
		}
	}

	async function handlePurge(id: string) {
		if (!confirm('Are you sure you want to permanently delete this entry? This cannot be undone.')) {
			return;
		}
		const res = await fetch(`/api/entries/${id}`, {
			method: 'DELETE'
		});
		if (res.ok) {
			activeEntry = null;
			await refreshData();
			toast.show('Entry permanently deleted', 'danger');
		} else {
			toast.show('Failed to delete entry', 'danger');
		}
	}

	async function handlePurgeAllTrash() {
		if (!confirm('Empty all trash permanently? This cannot be undone.')) {
			return;
		}
		const res = await fetch('/api/entries/purge-trash', {
			method: 'POST'
		});
		if (res.ok) {
			await refreshData();
			toast.show('Trash emptied permanently', 'danger');
		} else {
			toast.show('Failed to empty trash', 'danger');
		}
	}

	function handleNewEntryClick() {
		currentView = 'home';
		window.scrollTo({ top: 0, behavior: 'smooth' });
		setTimeout(() => {
			const titleInput = document.getElementById('entry-title');
			if (titleInput) titleInput.focus();
		}, 100);
	}

	function filterByTag(tag: string) {
		selectedTag = selectedTag === tag ? '' : tag;
		currentView = 'feed';
	}

	function filterByDayFromCal(dayKey: string) {
		selectedDay = dayKey;
		currentView = 'feed';
	}

	function clearAllFilters() {
		searchQuery = '';
		selectedMood = '';
		selectedTag = '';
		selectedDay = '';
	}

	// Calculate days left in trash
	function daysRemainingInTrash(deletedTimestamp: number): number {
		const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
		const elapsed = Date.now() - deletedTimestamp;
		const remainingMs = THIRTY_DAYS_MS - elapsed;
		return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
	}

	// Initial load refresh for trash count
	$effect(() => {
		if (currentUser) {
			refreshData();
		}
	});
</script>

{#if !currentUser}
	<div class="auth-page-wrap">
		<AuthModal onSuccess={handleAuthSuccess} />
	</div>
{:else}
	<div class="wrap">
		<Header
			{currentView}
			trashCount={trashEntries.length}
			user={currentUser}
			onSelectView={(v) => {
				currentView = v;
				if (v !== 'feed') selectedDay = '';
			}}
			onNewEntry={handleNewEntryClick}
			onLogout={handleLogout}
		/>

		<main id="main-content">
		<!-- 1. DASHBOARD VIEW -->
		{#if currentView === 'home'}
			<div class="bento">
				<!-- Composer Card -->
				<section class="card b-write" aria-labelledby="write-label">
					<div class="lbl" id="write-label">
						<span>Write a new entry</span>
						<span class="mu" style="font-size: 11px; text-transform: none;">Saved in SQLite</span>
					</div>
					<Composer onSave={handleSaveEntry} />
				</section>

				<!-- Mood Trend Card -->
				<section class="card b-mood" aria-labelledby="mood-label">
					<div class="lbl" id="mood-label">
						<span>Mood Trend · Last 7 Days</span>
						<span class="mu" style="font-size: 11px; text-transform: none;">Weekly overview</span>
					</div>
					<MoodChart {stats} />
				</section>

				<!-- On This Day Card -->
				<section class="card b-day" aria-labelledby="day-label">
					<div class="lbl" id="day-label">
						<span>On This Day</span>
						<span class="mu" style="font-size: 11px; text-transform: none;">Anniversary flashback</span>
					</div>
					<OnThisDay entry={onThisDay} onOpen={(e) => (activeEntry = e)} />
				</section>

				<!-- Tags & Stats Card -->
				<section class="card b-tags" aria-labelledby="tags-label">
					<div class="lbl" id="tags-label">
						<span>Tags & Topics</span>
						<span class="mu" style="font-size: 11px; text-transform: none;">{tags.length} active tags</span>
					</div>

					<div class="row tag-cloud">
						{#each tags as t}
							<button
								type="button"
								class="chip {selectedTag === t.tag ? 'on' : ''}"
								onclick={() => filterByTag(t.tag)}
							>
								#{t.tag} <span class="tag-count">· {t.count}</span>
							</button>
						{:else}
							<span class="mu" style="font-size: 13px;">No tags logged yet.</span>
						{/each}
					</div>

					<!-- Stats Grid -->
					<div class="stats-overview">
						<div class="lbl" style="margin-top: 18px; margin-bottom: 8px;">Journal Statistics</div>
						<div class="stats-grid">
							<div class="stat-box">
								<span class="stat-num">{stats.totalEntries}</span>
								<span class="stat-name">Entries</span>
							</div>
							<div class="stat-box">
								<span class="stat-num">{stats.totalWords.toLocaleString()}</span>
								<span class="stat-name">Words</span>
							</div>
							<div class="stat-box">
								<span class="stat-num">{stats.activeDays}</span>
								<span class="stat-name">Days Written</span>
							</div>
							<div class="stat-box">
								<span class="stat-num">{stats.totalEntries > 0 ? Math.round(stats.totalWords / stats.totalEntries) : 0}</span>
								<span class="stat-name">Avg Words</span>
							</div>
						</div>
					</div>
				</section>

				<!-- Recent Entries Card -->
				<section class="card b-recent" aria-labelledby="recent-label">
					<div class="lbl" id="recent-label">
						<span>Recent Entries</span>
						<button class="btn small" onclick={() => (currentView = 'feed')}>
							View all ({entries.length})
						</button>
					</div>

					<div class="recent-list">
						{#each entries.slice(0, 4) as entry}
							<EntryCard
								{entry}
								onOpen={(e) => (activeEntry = e)}
								onTagClick={filterByTag}
							/>
						{:else}
							<div class="empty">No journal entries written yet. Begin above!</div>
						{/each}
					</div>
				</section>
			</div>

		<!-- 2. ENTRIES FEED VIEW -->
		{:else if currentView === 'feed'}
			<div class="feed-view">
				<div class="card feed-filter-card">
					<!-- Search Box -->
					<div class="search-bar-wrap">
						<svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"></circle>
							<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
						</svg>
						<input
							type="text"
							id="feed-search"
							placeholder="Search entries, thoughts, tags, or reflections..."
							bind:value={searchQuery}
						/>
						{#if searchQuery}
							<button class="search-clear-btn" onclick={() => (searchQuery = '')} title="Clear search">
								✕
							</button>
						{/if}
					</div>

					<!-- Filter Pills Row -->
					<div class="feed-filters-row">
						<!-- Mood Filters -->
						<div class="filter-group">
							<span class="filter-lbl">Mood:</span>
							{#each Object.entries(MOODS) as [key, meta]}
								<button
									type="button"
									class="chip {selectedMood === key ? 'on' : ''}"
									onclick={() => (selectedMood = selectedMood === key ? '' : (key as MoodType))}
								>
									{meta.emoji} {meta.label}
								</button>
							{/each}
						</div>

						<!-- Tags Filters -->
						{#if tags.length > 0}
							<div class="filter-group">
								<span class="filter-lbl">Tag:</span>
								{#each tags.slice(0, 8) as t}
									<button
										type="button"
										class="chip {selectedTag === t.tag ? 'on' : ''}"
										onclick={() => (selectedTag = selectedTag === t.tag ? '' : t.tag)}
									>
										#{t.tag}
									</button>
								{/each}
							</div>
						{/if}

						<!-- Day Filter Notice -->
						{#if selectedDay}
							<div class="chip on">
								📅 Date: {selectedDay}
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button class="chip-remove" onclick={() => (selectedDay = '')}>✕</button>
							</div>
						{/if}

						<!-- Clear All Filters -->
						{#if searchQuery || selectedMood || selectedTag || selectedDay}
							<button type="button" class="chip" onclick={clearAllFilters} style="color: var(--dg);">
								✕ Clear All
							</button>
						{/if}

						<!-- Sort toggle -->
						<div class="sort-wrap">
							<button
								type="button"
								class="btn small"
								onclick={() => (sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest')}
								title="Toggle sort order"
							>
								{sortOrder === 'newest' ? '↓ Newest first' : '↑ Oldest first'}
							</button>
						</div>
					</div>
				</div>

				<!-- Entries List -->
				<div class="feed-list" id="entries-feed-list">
					<div class="feed-counter">
						Showing {filteredEntries.length} of {entries.length} entries
					</div>

					{#each filteredEntries as entry (entry.id)}
						<EntryCard
							{entry}
							onOpen={(e) => (activeEntry = e)}
							onTagClick={filterByTag}
						/>
					{:else}
						<div class="card empty">
							<p>No entries match your search criteria.</p>
							{#if searchQuery || selectedMood || selectedTag || selectedDay}
								<button class="btn pri" style="margin-top: 14px;" onclick={clearAllFilters}>
									Clear Filters
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</div>

		<!-- 3. CALENDAR VIEW -->
		{:else if currentView === 'cal'}
			<div class="calendar-view">
				<CalendarView
					{entries}
					onSelectDayFeed={filterByDayFromCal}
					onOpenEntry={(e) => (activeEntry = e)}
				/>
			</div>

		<!-- 4. TRASH VIEW -->
		{:else if currentView === 'trash'}
			<div class="trash-view">
				<div class="card trash-header-card">
					<div class="ent-h">
						<div>
							<h2>Trash Bin</h2>
							<p class="mu" style="font-size: 13.5px; margin-top: 4px;">
								Deleted entries are kept in SQLite for 30 days before automatic purge.
							</p>
						</div>

						{#if trashEntries.length > 0}
							<button class="btn dg" onclick={handlePurgeAllTrash}>
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								</svg>
								Empty Trash
							</button>
						{/if}
					</div>
				</div>

				<div class="trash-list">
					{#each trashEntries as entry (entry.id)}
						{@const daysLeft = daysRemainingInTrash(entry.deleted || Date.now())}
						<div class="card trash-item">
							<div class="ent-h">
								<h3>
									<span>{MOODS[entry.mood]?.emoji || '📝'}</span>
									{entry.title || 'Untitled Entry'}
								</h3>

								<span class="days-left-badge {daysLeft <= 5 ? 'urgent' : ''}">
									{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
								</span>
							</div>

							<p class="trash-snippet">
								{stripMarkdown(entry.content).slice(0, 140)}...
							</p>

							<div class="trash-footer">
								<span class="mu" style="font-size: 12.5px;">
									Deleted {formatDate(entry.deleted || Date.now())}
								</span>

								<div class="row">
									<button class="btn small" onclick={() => handleRestore(entry.id)}>
										Restore
									</button>
									<button class="btn dg small" onclick={() => handlePurge(entry.id)}>
										Delete Forever
									</button>
								</div>
							</div>
						</div>
					{:else}
						<div class="card empty">
							<p>Trash is completely empty.</p>
						</div>
					{/each}
				</div>
			</div>
		{:else if currentView === 'admin' && currentUser?.role === 'admin'}
			<AdminPanel />
		{/if}
	</main>
</div>
{/if}

<!-- Detail & Edit Modal -->
<DetailModal
	entry={activeEntry}
	onClose={() => (activeEntry = null)}
	onSaveEdit={handleSaveEntry}
	onTrash={handleTrash}
	onRestore={handleRestore}
	onPurge={handlePurge}
	onTagClick={filterByTag}
/>

<!-- Toast Notifications -->
<Toast />

<style>
	/* Tag cloud styling */
	.tag-cloud {
		margin-bottom: 12px;
	}

	.tag-count {
		opacity: 0.7;
		font-size: 11px;
	}

	/* Stats box */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	@media (min-width: 768px) and (max-width: 1099px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (min-width: 1480px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.stat-box {
		background: var(--in);
		border: 1px solid var(--bd);
		border-radius: 14px;
		padding: 12px 10px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 3px;
		transition: transform 0.15s ease, border-color 0.15s ease;
	}

	.stat-box:hover {
		border-color: var(--bd-strong);
		transform: translateY(-1px);
	}

	.stat-num {
		font-size: clamp(17px, 1.4vw, 22px);
		font-weight: 700;
		color: var(--tx);
		font-feature-settings: 'tnum';
	}

	.stat-name {
		font-size: 11px;
		color: var(--mu);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.recent-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	@media (min-width: 1360px) {
		.recent-list {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
			gap: 12px;
		}
	}

	/* Feed view */
	.feed-view {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.feed-filter-card {
		padding: 16px;
	}

	.search-bar-wrap {
		position: relative;
		display: flex;
		align-items: center;
		margin-bottom: 14px;
	}

	.search-icon {
		position: absolute;
		left: 14px;
		color: var(--mu);
		pointer-events: none;
	}

	.search-bar-wrap input {
		padding-left: 42px;
		padding-right: 40px;
		font-size: 15px;
	}

	.search-clear-btn {
		position: absolute;
		right: 12px;
		color: var(--mu);
		padding: 4px 8px;
		font-size: 14px;
	}

	.feed-filters-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.filter-lbl {
		font-size: 12px;
		color: var(--mu);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-right: 2px;
	}

	.chip-remove {
		font-size: 11px;
		margin-left: 4px;
		color: inherit;
	}

	.sort-wrap {
		margin-left: auto;
	}

	@media (max-width: 640px) {
		.sort-wrap {
			margin-left: 0;
			width: 100%;
		}
		.sort-wrap .btn {
			width: 100%;
		}
	}

	.feed-counter {
		font-size: 13px;
		color: var(--mu);
		margin: 4px 4px 12px;
	}

	.feed-list {
		display: flex;
		flex-direction: column;
	}

	/* Trash view */
	.trash-view {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 800px;
		margin: 0 auto;
	}

	.trash-header-card {
		padding: 20px;
	}

	.trash-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.trash-item {
		padding: 18px;
	}

	.days-left-badge {
		font-size: 12px;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--in);
		border: 1px solid var(--bd);
		color: var(--mu);
	}

	.days-left-badge.urgent {
		background: var(--dg-light);
		color: var(--dg);
		border-color: var(--dg);
	}

	.trash-snippet {
		margin: 8px 0 14px;
		color: var(--tx-dim);
		font-size: 14px;
		line-height: 1.5;
	}

	.trash-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.btn.small {
		padding: 4px 12px;
		font-size: 12.5px;
	}

	.auth-page-wrap {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background: radial-gradient(circle at 50% 25%, rgba(201, 167, 124, 0.08), transparent 70%);
	}
</style>
