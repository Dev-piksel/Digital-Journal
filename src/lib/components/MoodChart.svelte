<script lang="ts">
	import type { JournalStats } from '#lib/types';
	import { MOODS } from '#lib/types';

	interface Props {
		stats: JournalStats;
	}

	let { stats }: Props = $props();

	let hoveredIndex: number | null = $state(null);

	const maxScore = 5;
	const chartHeight = 110;
	const barWidth = 26;
	const barSpacing = 40;
	const startX = 14;
	const baseLineY = 92;
</script>

<div class="mood-chart-card">
	<div class="chart-wrapper">
		<svg
			viewBox="0 0 290 125"
			width="100%"
			role="img"
			aria-label="Mood trend over last 7 days"
			class="chart-svg"
		>
			<defs>
				<linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--ac)" stop-opacity="0.95" />
					<stop offset="100%" stop-color="var(--ac)" stop-opacity="0.6" />
				</linearGradient>
				<linearGradient id="barActiveGradient" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--ac-hover)" stop-opacity="1" />
					<stop offset="100%" stop-color="var(--ac)" stop-opacity="0.8" />
				</linearGradient>
			</defs>

			<!-- Baseline guide -->
			<line
				x1="8"
				y1={baseLineY}
				x2="282"
				y2={baseLineY}
				stroke="var(--bd)"
				stroke-width="1"
				stroke-dasharray="3 3"
			/>

			{#each stats.last7Days as day, i}
				{@const x = startX + i * barSpacing}
				{@const barHeight = Math.max(day.score > 0 ? (day.score / maxScore) * 64 : 6, 6)}
				{@const y = baseLineY - barHeight}
				{@const isHovered = hoveredIndex === i}

				<!-- Day Bar Group -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<g
					class="bar-group"
					onmouseenter={() => (hoveredIndex = i)}
					onmouseleave={() => (hoveredIndex = null)}
					style="cursor: pointer;"
				>
					<!-- Hit area -->
					<rect
						{x}
						y={10}
						width={barWidth}
						height={105}
						fill="transparent"
					/>

					<!-- Bar -->
					<rect
						{x}
						{y}
						width={barWidth}
						height={barHeight}
						rx="7"
						fill={day.score > 0
							? isHovered
								? 'url(#barActiveGradient)'
								: 'url(#barGradient)'
							: 'var(--in)'}
						stroke={day.score > 0 ? 'transparent' : 'var(--bd)'}
						stroke-width="1"
						class="bar-rect"
					/>

					<!-- Mood Emoji above bar -->
					{#if day.primaryEmoji}
						<text
							x={x + barWidth / 2}
							y={y - 7}
							text-anchor="middle"
							font-size="14"
							class="mood-emoji-text"
						>
							{day.primaryEmoji}
						</text>
					{/if}

					<!-- Day Label -->
					<text
						x={x + barWidth / 2}
						y={baseLineY + 18}
						text-anchor="middle"
						font-size="11.5"
						font-weight="600"
						fill={isHovered ? 'var(--tx)' : 'var(--mu)'}
						class="day-label"
					>
						{day.dayLabel}
					</text>
				</g>
			{/each}
		</svg>
	</div>

	<!-- Insight summary footer -->
	<div class="chart-summary">
		{#if stats.mostFrequentMood && MOODS[stats.mostFrequentMood as keyof typeof MOODS]}
			{@const meta = MOODS[stats.mostFrequentMood as keyof typeof MOODS]}
			<span class="insight-badge">
				<span>Dominant:</span>
				<span class="badge-pill">{meta.emoji} {meta.label}</span>
			</span>
		{:else}
			<span class="insight-badge">Write daily to track mood trends</span>
		{/if}

		{#if hoveredIndex !== null}
			{@const hovered = stats.last7Days[hoveredIndex]}
			<span class="hover-info">
				{hovered.fullDate}: {hovered.entryCount} {hovered.entryCount === 1 ? 'entry' : 'entries'}
			</span>
		{:else}
			<span class="hover-info">
				Last 7 Days
			</span>
		{/if}
	</div>
</div>

<style>
	.mood-chart-card {
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: space-between;
	}

	.chart-wrapper {
		width: 100%;
		padding: 4px 0;
	}

	.chart-svg {
		overflow: visible;
	}

	.bar-rect {
		transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.bar-group:hover .bar-rect {
		transform: scaleY(1.04);
		transform-origin: bottom;
	}

	.chart-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12.5px;
		color: var(--mu);
		margin-top: 6px;
		padding-top: 8px;
		border-top: 1px solid var(--bd);
		flex-wrap: wrap;
		gap: 8px;
	}

	.insight-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.badge-pill {
		color: var(--tx);
		font-weight: 600;
	}

	.hover-info {
		font-feature-settings: 'tnum';
	}
</style>
