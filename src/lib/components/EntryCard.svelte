<script lang="ts">
	import type { JournalEntry } from '#lib/types';
	import { MOODS } from '#lib/types';
	import { formatDate, stripMarkdown } from '#lib/utils/markdown';

	interface Props {
		entry: JournalEntry;
		onOpen: (entry: JournalEntry) => void;
		onTagClick?: (tag: string) => void;
	}

	let { entry, onOpen, onTagClick }: Props = $props();

	let moodMeta = $derived(MOODS[entry.mood] || { emoji: '📝', label: 'Journal' });
	let wasEdited = $derived(entry.updated - entry.created > 60000);
</script>

<div
	class="card entry-card"
	role="button"
	tabindex="0"
	onclick={() => onOpen(entry)}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onOpen(entry);
		}
	}}
>
	<div class="ent-h">
		<h3>
			<span class="mood-indicator" title="{moodMeta.label}">{moodMeta.emoji}</span>
			{entry.title || 'Untitled Entry'}
		</h3>
		<span class="entry-date-stamp">
			{formatDate(entry.created)}
			{#if wasEdited}
				<span class="edited-tag">· edited</span>
			{/if}
		</span>
	</div>

	<p>{stripMarkdown(entry.content) || 'No additional content...'}</p>

	{#if entry.tags && entry.tags.length > 0}
		<div class="row tags-row">
			{#each entry.tags as tag}
				<button
					type="button"
					class="chip small"
					onclick={(e) => {
						e.stopPropagation();
						if (onTagClick) onTagClick(tag);
					}}
				>
					#{tag}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.ent-h {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px 12px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.ent-h h3 {
		flex: 1 1 180px;
		min-width: 0;
		word-break: break-word;
		font-size: 18px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mood-indicator {
		font-size: 20px;
		line-height: 1;
		flex-shrink: 0;
	}

	.entry-date-stamp {
		font-size: 12.5px;
		color: var(--mu);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.edited-tag {
		font-size: 11.5px;
		opacity: 0.8;
	}

	.tags-row {
		margin-top: 8px;
		flex-wrap: wrap;
		gap: 6px;
	}
</style>
