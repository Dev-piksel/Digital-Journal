<script lang="ts">
	import type { JournalEntry } from '#lib/types';
	import { MOODS } from '#lib/types';
	import { formatDate, stripMarkdown } from '#lib/utils/markdown';

	interface Props {
		entry: JournalEntry | null;
		onOpen: (entry: JournalEntry) => void;
	}

	let { entry, onOpen }: Props = $props();

	let yearsAgo = $derived.by(() => {
		if (!entry) return 1;
		const diffMs = Date.now() - entry.created;
		const years = Math.round(diffMs / (365.25 * 864e5));
		return Math.max(1, years);
	});
</script>

<div class="on-this-day-card">
	{#if entry}
		<div class="flashback-header">
			<span class="memory-badge">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<polyline points="12 6 12 12 16 14"></polyline>
				</svg>
				{yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago today
			</span>
			<span class="entry-date">{formatDate(entry.created)}</span>
		</div>

		<h3 class="entry-title">
			<span class="mood-icon">{MOODS[entry.mood]?.emoji || '📝'}</span>
			{entry.title || 'Untitled Memory'}
		</h3>

		<p class="entry-snippet">
			{stripMarkdown(entry.content).slice(0, 130)}...
		</p>

		<div class="card-footer">
			<div class="row">
				{#each entry.tags as tag}
					<span class="chip small">#{tag}</span>
				{/each}
			</div>

			<button
				type="button"
				class="btn small"
				onclick={() => onOpen(entry)}
			>
				Revisit
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="5" y1="12" x2="19" y2="12"></line>
					<polyline points="12 5 19 12 12 19"></polyline>
				</svg>
			</button>
		</div>
	{:else}
		<div class="no-memory">
			<div class="prompt-icon">🌱</div>
			<h4>No entries from this date in past years</h4>
			<p>
				Today's reflections will become tomorrow's memories. Keep writing—next year you will thank yourself.
			</p>
		</div>
	{/if}
</div>

<style>
	.on-this-day-card {
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: space-between;
	}

	.flashback-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
		gap: 8px;
		flex-wrap: wrap;
	}

	.memory-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--ac-light);
		color: var(--ac);
		border: 1px solid var(--ac);
		border-radius: 999px;
		padding: 2px 10px;
		font-size: 11.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		flex-shrink: 0;
	}

	.entry-date {
		font-size: 12px;
		color: var(--mu);
		flex-shrink: 0;
	}

	.entry-title {
		font-size: 18px;
		margin: 6px 0;
		display: flex;
		align-items: baseline;
		gap: 8px;
		word-break: break-word;
	}

	.entry-snippet {
		font-size: 14px;
		color: var(--tx-dim);
		line-height: 1.5;
		margin-bottom: 14px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		word-break: break-word;
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-top: auto;
		flex-wrap: wrap;
	}

	.btn.small {
		padding: 5px 12px;
		font-size: 12.5px;
	}

	.no-memory {
		text-align: center;
		padding: 16px 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.prompt-icon {
		font-size: 28px;
		margin-bottom: 8px;
	}

	.no-memory h4 {
		font-size: 15px;
		margin-bottom: 6px;
	}

	.no-memory p {
		font-size: 13.5px;
		color: var(--mu);
		max-width: 320px;
		margin: 0 auto;
		line-height: 1.5;
	}
</style>
