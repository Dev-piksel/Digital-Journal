import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllEntries,
	createEntry,
	getJournalStats,
	getTagsSummary,
	getOnThisDayMemory
} from '#lib/server/db';
import type { MoodType } from '#lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const userId = locals.user.id;
	const view = (url.searchParams.get('view') as 'active' | 'trash' | 'all') || 'active';
	const q = url.searchParams.get('q') || '';
	const tag = url.searchParams.get('tag') || '';
	const mood = url.searchParams.get('mood') || '';
	const day = url.searchParams.get('day') || '';

	const entries = getAllEntries(userId, { view, q, tag, mood, day });
	const stats = getJournalStats(userId);
	const tags = getTagsSummary(userId);
	const onThisDay = getOnThisDayMemory(userId);

	return json({
		entries,
		stats,
		tags,
		onThisDay
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { title = '', content = '', mood = 'calm', tags = [] } = body;

		if (!title.trim() && !content.trim()) {
			return json({ error: 'Title or content is required.' }, { status: 400 });
		}

		const entry = createEntry(locals.user.id, {
			title: title.trim(),
			content: content.trim(),
			mood: (mood as MoodType) || 'calm',
			tags: Array.isArray(tags) ? tags : []
		});

		return json({ entry }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to create entry';
		return json({ error: message }, { status: 500 });
	}
};
