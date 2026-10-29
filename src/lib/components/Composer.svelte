<script lang="ts">
	import type { MoodType } from '#lib/types';
	import { MOODS } from '#lib/types';

	interface Props {
		id?: string;
		title?: string;
		content?: string;
		mood?: MoodType;
		tags?: string[];
		isModal?: boolean;
		onSave: (data: {
			id?: string;
			title: string;
			content: string;
			mood: MoodType;
			tags: string[];
		}) => Promise<void> | void;
		onCancel?: () => void;
	}

	let {
		id = undefined,
		title = '',
		content = '',
		mood = 'calm',
		tags = [],
		isModal = false,
		onSave,
		onCancel
	}: Props = $props();

	let currentTitle = $state('');
	let currentContent = $state('');
	let currentMood = $state<MoodType>('calm');
	let currentTagsInput = $state('');
	let isSaving = $state(false);
	let textareaEl: HTMLTextAreaElement | null = $state(null);

	$effect(() => {
		currentTitle = title;
		currentContent = content;
		currentMood = mood;
		currentTagsInput = tags.join(', ');
	});

	// Word count calculation
	let wordCount = $derived(
		currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0
	);

	function insertFormat(prefix: string, suffix: string = '') {
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const text = textareaEl.value;
		const selected = text.slice(start, end);

		let replacement = '';
		if (prefix === '- ') {
			replacement = prefix + (selected || 'list item');
		} else if (prefix === '> ') {
			replacement = prefix + (selected || 'quote');
		} else {
			replacement = prefix + (selected || 'text') + (suffix || prefix);
		}

		textareaEl.value = text.slice(0, start) + replacement + text.slice(end);
		currentContent = textareaEl.value;

		const newPos = start + prefix.length + (selected ? selected.length : (prefix === '- ' ? 9 : 4));
		textareaEl.focus();
		textareaEl.setSelectionRange(newPos, newPos);
	}

	async function handleSubmit() {
		if (!currentTitle.trim() && !currentContent.trim()) {
			return;
		}

		const parsedTags = currentTagsInput
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);

		isSaving = true;
		try {
			await onSave({
				id,
				title: currentTitle.trim(),
				content: currentContent,
				mood: currentMood,
				tags: parsedTags
			});

			if (!id) {
				currentTitle = '';
				currentContent = '';
				currentMood = 'calm';
				currentTagsInput = '';
			}
		} finally {
			isSaving = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	class="composer-container {isModal ? 'modal-mode' : ''}"
	onkeydown={handleKeyDown}
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	aria-label="Journal entry composer"
>
	<input
		type="text"
		id="entry-title"
		placeholder="Title (optional)"
		bind:value={currentTitle}
		class="title-input"
	/>

	<div class="tb-wrapper">
		<div class="tb">
			<button
				type="button"
				class="btn tb-btn"
				onclick={() => insertFormat('**', '**')}
				title="Bold (Markdown **text**)"
			>
				<strong>B</strong>
			</button>
			<button
				type="button"
				class="btn tb-btn"
				onclick={() => insertFormat('*', '*')}
				title="Italic (Markdown *text*)"
			>
				<em>I</em>
			</button>
			<button
				type="button"
				class="btn tb-btn"
				onclick={() => insertFormat('- ')}
				title="Bulleted List"
			>
				• List
			</button>
			<button
				type="button"
				class="btn tb-btn"
				onclick={() => insertFormat('> ')}
				title="Quote"
			>
				“ Quote
			</button>
			<button
				type="button"
				class="btn tb-btn"
				onclick={() => insertFormat('`', '`')}
				title="Inline Code"
			>
				&lt;/&gt;
			</button>
		</div>

		<div class="counter-badge">
			{wordCount} {wordCount === 1 ? 'word' : 'words'}
		</div>
	</div>

	<textarea
		id="entry-content"
		bind:this={textareaEl}
		bind:value={currentContent}
		placeholder="What’s on your mind today? Write freely..."
		rows={isModal ? 9 : 7}
	></textarea>

	<div class="composer-meta">
		<div class="lbl" style="margin-bottom: 6px;">How are you feeling?</div>
		<div class="mood-picker">
			{#each Object.entries(MOODS) as [key, meta]}
				<button
					type="button"
					class="mood-btn {currentMood === key ? 'on' : ''}"
					onclick={() => (currentMood = key as MoodType)}
					title="{meta.label} mood"
				>
					<span class="mood-emoji">{meta.emoji}</span>
					<span class="mood-name">{meta.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="composer-tags">
		<input
			type="text"
			id="entry-tags"
			placeholder="Tags (comma separated, e.g. Wellness, Ideas, Work)"
			bind:value={currentTagsInput}
		/>
	</div>

	<div class="composer-footer">
		<span class="shortcut-tip">
			Tip: Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save
		</span>

		<div class="footer-actions">
			{#if onCancel}
				<button type="button" class="btn" onclick={onCancel} disabled={isSaving}>
					Cancel
				</button>
			{/if}
			<button
				type="button"
				class="btn pri submit-btn"
				onclick={handleSubmit}
				disabled={isSaving || (!currentTitle.trim() && !currentContent.trim())}
			>
				{#if isSaving}
					Saving...
				{:else if id}
					Save Changes
				{:else}
					Save Entry
				{/if}
			</button>
		</div>
	</div>
</form>

<style>
	.composer-container {
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		min-width: 0;
	}

	.title-input {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: clamp(16px, 1.3vw, 19px);
		font-weight: 500;
	}

	.tb-wrapper {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.tb {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		padding-bottom: 2px;
		max-width: 100%;
		min-width: 0;
	}

	.tb::-webkit-scrollbar {
		display: none;
	}

	.tb-btn {
		flex-shrink: 0;
		padding: 5px 12px;
		font-size: 13px;
	}

	.counter-badge {
		font-size: 12px;
		color: var(--mu);
		font-feature-settings: 'tnum';
		white-space: nowrap;
		flex-shrink: 0;
	}

	textarea {
		min-height: clamp(130px, 18vh, 190px);
		line-height: 1.6;
		width: 100%;
	}

	.composer-meta {
		margin-top: 2px;
		min-width: 0;
	}

	.mood-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.composer-tags {
		margin-top: 2px;
		width: 100%;
	}

	.composer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
		flex-wrap: wrap;
		gap: 12px;
		width: 100%;
		min-width: 0;
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		margin-left: auto;
	}

	.shortcut-tip {
		font-size: 12px;
		color: var(--mu);
		white-space: normal;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 1;
		min-width: 0;
	}

	kbd {
		background: var(--in);
		border: 1px solid var(--bd);
		border-radius: 4px;
		padding: 2px 5px;
		font-family: inherit;
		font-size: 11px;
		white-space: nowrap;
	}

	/* Prevent overlap whenever container is narrower than 440px */
	@container (max-width: 440px) {
		.composer-footer {
			flex-direction: column-reverse;
			align-items: stretch;
			gap: 10px;
		}

		.shortcut-tip {
			text-align: center;
			justify-content: center;
			width: 100%;
		}

		.footer-actions {
			width: 100%;
			margin-left: 0;
			justify-content: stretch;
		}

		.submit-btn {
			width: 100%;
			flex: 1;
		}
	}

	@media (max-width: 480px) {
		.composer-footer {
			flex-direction: column-reverse;
			align-items: stretch;
			gap: 10px;
		}

		.shortcut-tip {
			text-align: center;
			justify-content: center;
			width: 100%;
		}

		.footer-actions {
			width: 100%;
			margin-left: 0;
		}

		.submit-btn {
			width: 100%;
			flex: 1;
		}
	}
</style>
