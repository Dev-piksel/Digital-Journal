<script lang="ts">
	import type { JournalEntry } from '#lib/types';
	import { MOODS } from '#lib/types';
	import { getDateKey, formatDate, stripMarkdown } from '#lib/utils/markdown';

	interface Props {
		entries: JournalEntry[];
		onSelectDayFeed: (dayKey: string) => void;
		onOpenEntry: (entry: JournalEntry) => void;
	}

	let { entries, onSelectDayFeed, onOpenEntry }: Props = $props();

	const now = new Date();
	let currentMonthDate = $state(new Date(now.getFullYear(), now.getMonth(), 1));
	let selectedDateKey = $state<string | null>(null);

	// Group entries by day key
	let entriesByDay = $derived.by(() => {
		const map = new Map<string, JournalEntry[]>();
		for (const e of entries) {
			const key = getDateKey(e.created);
			const list = map.get(key) || [];
			list.push(e);
			map.set(key, list);
		}
		return map;
	});

	// Calendar calculations
	let year = $derived(currentMonthDate.getFullYear());
	let month = $derived(currentMonthDate.getMonth());
	let monthTitle = $derived(
		currentMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
	);
	let firstDayOfWeek = $derived(new Date(year, month, 1).getDay());
	let daysInMonth = $derived(new Date(year, month + 1, 0).getDate());

	let todayKey = $derived(`${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`);

	function changeMonth(delta: number) {
		currentMonthDate = new Date(year, month + delta, 1);
	}

	function goToToday() {
		currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
		selectedDateKey = todayKey;
	}

	function selectDay(dayKey: string) {
		if (selectedDateKey === dayKey) {
			selectedDateKey = null;
		} else {
			selectedDateKey = dayKey;
		}
	}

	let selectedDayEntries = $derived.by(() => {
		if (!selectedDateKey) return [];
		return entriesByDay.get(selectedDateKey) || [];
	});
</script>

<div class="calendar-component">
	<div class="card cal-card">
		<!-- Month Header -->
		<div class="cal-header">
			<div class="cal-nav-group">
				<button class="btn icon-only" onclick={() => changeMonth(-1)} title="Previous month">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
				</button>
				<h2>{monthTitle}</h2>
				<button class="btn icon-only" onclick={() => changeMonth(1)} title="Next month">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
			</div>

			<button class="btn small" onclick={goToToday}>
				Today
			</button>
		</div>

		<!-- Days of Week Header -->
		<div class="cal-grid weekdays-row">
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as dayName}
				<div class="weekday-cell">{dayName}</div>
			{/each}
		</div>

		<!-- Month Cells -->
		<div class="cal-grid days-grid">
			<!-- Empty prefix cells -->
			{#each Array(firstDayOfWeek) as _}
				<div class="day-cell empty-slot"></div>
			{/each}

			<!-- Days of month -->
			{#each Array(daysInMonth) as _, index}
				{@const dayNum = index + 1}
				{@const dayKey = `${year}-${month}-${dayNum}`}
				{@const dayEntries = entriesByDay.get(dayKey) || []}
				{@const hasEntries = dayEntries.length > 0}
				{@const isToday = dayKey === todayKey}
				{@const isSelected = dayKey === selectedDateKey}

				<button
					type="button"
					class="day-cell {hasEntries ? 'has-entries' : ''} {isToday ? 'today' : ''} {isSelected ? 'selected' : ''}"
					onclick={() => selectDay(dayKey)}
					title="{dayNum} {monthTitle}{hasEntries ? ` (${dayEntries.length} entries)` : ''}"
				>
					<span class="day-num">{dayNum}</span>

					{#if hasEntries}
						<div class="day-indicators">
							{#each dayEntries.slice(0, 2) as entry}
								<span class="mood-dot" title="{entry.mood}">
									{MOODS[entry.mood]?.emoji || '•'}
								</span>
							{/each}
							{#if dayEntries.length > 2}
								<span class="more-count">+{dayEntries.length - 2}</span>
							{/if}
						</div>
					{/if}
				</button>
			{/each}
		</div>

		<p class="cal-footer-tip">
			Tap on any highlighted day with entries to inspect or read.
		</p>
	</div>

	<!-- Selected Day Inspector Drawer / Card -->
	{#if selectedDateKey}
		<div class="card selected-day-card">
			<div class="ent-h" style="margin-bottom: 12px;">
				<div>
					<div class="lbl" style="margin-bottom: 4px;">Selected Date</div>
					<h3>
						{new Date(
							parseInt(selectedDateKey.split('-')[0]),
							parseInt(selectedDateKey.split('-')[1]),
							parseInt(selectedDateKey.split('-')[2])
						).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
					</h3>
				</div>

				<div class="row">
					{#if selectedDayEntries.length > 0}
						<button
							class="btn small"
							onclick={() => onSelectDayFeed(selectedDateKey!)}
						>
							View in Entries Feed
						</button>
					{/if}
					<button class="btn icon-only" onclick={() => (selectedDateKey = null)} title="Close preview">
						✕
					</button>
				</div>
			</div>

			{#if selectedDayEntries.length > 0}
				<div class="day-entries-list">
					{#each selectedDayEntries as entry}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="day-entry-item"
							onclick={() => onOpenEntry(entry)}
							onkeydown={(e) => e.key === 'Enter' && onOpenEntry(entry)}
							role="button"
							tabindex="0"
						>
							<div class="ent-h">
								<h4>
									<span>{MOODS[entry.mood]?.emoji || '📝'}</span>
									{entry.title || 'Untitled Entry'}
								</h4>
								<span class="mu" style="font-size: 12px;">{new Date(entry.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
							</div>
							<p>{stripMarkdown(entry.content).slice(0, 100)}...</p>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty" style="padding: 20px 0;">
					No journal entries written on this day.
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.calendar-component {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 620px;
		margin: 0 auto;
	}

	.cal-card {
		padding: 24px;
	}

	.cal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.cal-nav-group {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.cal-nav-group h2 {
		font-size: 22px;
		min-width: 170px;
		text-align: center;
	}

	.cal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 8px;
		text-align: center;
	}

	.weekdays-row {
		margin-bottom: 8px;
	}

	.weekday-cell {
		font-size: 12px;
		font-weight: 600;
		color: var(--mu);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 4px 0;
	}

	.day-cell {
		aspect-ratio: 1;
		border-radius: 14px;
		border: 1px solid var(--bd);
		background: var(--in);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4px;
		position: relative;
		transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.day-cell:hover:not(.empty-slot) {
		border-color: var(--ac);
		transform: translateY(-2px);
		background: var(--card-hover);
	}

	.day-cell.empty-slot {
		visibility: hidden;
		pointer-events: none;
	}

	.day-cell.today {
		border-color: var(--ac2);
		box-shadow: 0 0 0 1.5px var(--ac2);
	}

	.day-cell.has-entries {
		background: var(--ac-light);
		border-color: var(--ac);
		cursor: pointer;
	}

	.day-cell.selected {
		border-color: var(--ac);
		background: var(--ac-glow);
		box-shadow: 0 0 0 2px var(--ac);
	}

	.day-num {
		font-size: 13.5px;
		font-weight: 500;
	}

	.day-indicators {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		margin-top: 2px;
		font-size: 11px;
		line-height: 1;
	}

	.mood-dot {
		font-size: 12px;
	}

	.more-count {
		font-size: 9px;
		color: var(--ac);
		font-weight: 700;
	}

	.cal-footer-tip {
		margin-top: 18px;
		font-size: 13px;
		color: var(--mu);
		text-align: center;
	}

	.selected-day-card {
		animation: slideUp 0.2s ease;
	}

	.day-entries-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.day-entry-item {
		padding: 12px;
		border-radius: 12px;
		border: 1px solid var(--bd);
		background: var(--in);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.day-entry-item:hover {
		border-color: var(--ac);
		background: var(--card-hover);
	}

	.day-entry-item h4 {
		font-size: 16px;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.day-entry-item p {
		margin-top: 4px;
		font-size: 13px;
		color: var(--tx-dim);
	}
</style>
