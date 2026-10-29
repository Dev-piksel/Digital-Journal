<script lang="ts">
	import type { JournalEntry, MoodType } from '#lib/types';
	import { MOODS } from '#lib/types';
	import { formatDate, formatTime, renderMarkdown } from '#lib/utils/markdown';
	import Composer from './Composer.svelte';

	interface Props {
		entry: JournalEntry | null;
		onClose: () => void;
		onSaveEdit: (data: {
			id?: string;
			title: string;
			content: string;
			mood: MoodType;
			tags: string[];
		}) => Promise<void>;
		onTrash: (id: string) => Promise<void>;
		onRestore?: (id: string) => Promise<void>;
		onPurge?: (id: string) => Promise<void>;
		onTagClick?: (tag: string) => void;
	}

	let {
		entry,
		onClose,
		onSaveEdit,
		onTrash,
		onRestore,
		onPurge,
		onTagClick
	}: Props = $props();

	let isEditing = $state(false);

	// Word count & read time
	let wordCount = $derived(
		entry?.content ? entry.content.trim().split(/\s+/).filter(Boolean).length : 0
	);
	let readTimeMin = $derived(Math.max(1, Math.ceil(wordCount / 200)));

	let wasEdited = $derived(
		entry ? entry.updated - entry.created > 60000 : false
	);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (isEditing) {
				isEditing = false;
			} else {
				onClose();
			}
		}
	}

	async function handleSave(data: {
		id?: string;
		title: string;
		content: string;
		mood: MoodType;
		tags: string[];
	}) {
		await onSaveEdit(data);
		isEditing = false;
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if entry}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={handleBackdropClick}>
		<div class="modal-content">
			{#if isEditing}
				<div class="ent-h" style="margin-bottom: 16px;">
					<h2>Edit Entry</h2>
					<button class="btn icon-only" onclick={() => (isEditing = false)} title="Cancel edit">
						✕
					</button>
				</div>

				<Composer
					id={entry.id}
					title={entry.title}
					content={entry.content}
					mood={entry.mood}
					tags={entry.tags}
					isModal={true}
					onSave={handleSave}
					onCancel={() => (isEditing = false)}
				/>
			{:else}
				<!-- Header -->
				<div class="ent-h">
					<h2>
						<span class="detail-mood-icon" title="{entry.mood}">
							{MOODS[entry.mood]?.emoji || '📝'}
						</span>
						{entry.title || 'Untitled Entry'}
					</h2>
					<button class="btn icon-only" onclick={onClose} title="Close">
						✕
					</button>
				</div>

				<!-- Meta Bar -->
				<div class="detail-meta">
					<span>{formatDate(entry.created)} at {formatTime(entry.created)}</span>
					<span>·</span>
					<span>{wordCount} words</span>
					<span>·</span>
					<span>{readTimeMin} min read</span>
					{#if wasEdited}
						<span>·</span>
						<span class="edited-note">Edited {formatDate(entry.updated)}</span>
					{/if}
				</div>

				<!-- Content Body with Markdown Rendering -->
				<div class="body">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderMarkdown(entry.content)}
				</div>

				<!-- Tags -->
				{#if entry.tags && entry.tags.length > 0}
					<div class="row" style="margin-top: 20px;">
						{#each entry.tags as tag}
							<button
								type="button"
								class="chip"
								onclick={() => {
									onClose();
									if (onTagClick) onTagClick(tag);
								}}
							>
								#{tag}
							</button>
						{/each}
					</div>
				{/if}

				<!-- Action Footer -->
				<div class="modal-footer">
					{#if entry.deleted}
						<div class="row">
							{#if onRestore}
								<button
									class="btn pri"
									onclick={() => onRestore && onRestore(entry.id)}
								>
									Restore from Trash
								</button>
							{/if}
							{#if onPurge}
								<button
									class="btn dg"
									onclick={() => onPurge && onPurge(entry.id)}
								>
									Delete Permanently
								</button>
							{/if}
						</div>
					{:else}
						<button
							class="btn dg"
							onclick={() => onTrash(entry.id)}
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
							</svg>
							Move to Trash
						</button>

						<button
							class="btn pri"
							onclick={() => (isEditing = true)}
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
							Edit Entry
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.ent-h {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 14px;
		min-width: 0;
	}

	.ent-h h2 {
		flex: 1 1 auto;
		min-width: 0;
		word-break: break-word;
	}

	.ent-h .btn.icon-only {
		flex-shrink: 0;
	}

	.detail-mood-icon {
		font-size: 24px;
		margin-right: 6px;
	}

	.detail-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--mu);
		margin: 6px 0 18px;
		flex-wrap: wrap;
	}

	.edited-note {
		color: var(--ac);
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 28px;
		padding-top: 18px;
		border-top: 1px solid var(--bd);
		flex-wrap: wrap;
	}
</style>
