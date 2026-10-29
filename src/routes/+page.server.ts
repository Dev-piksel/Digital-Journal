import type { PageServerLoad } from './$types';
import {
	getAllEntries,
	getJournalStats,
	getTagsSummary,
	getOnThisDayMemory
} from '#lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return {
			user: null,
			initialEntries: [],
			stats: {
				totalEntries: 0,
				totalWords: 0,
				activeDays: 0,
				mostFrequentMood: null,
				last7Days: []
			},
			tags: [],
			onThisDay: null
		};
	}

	const entries = getAllEntries(user.id, { view: 'active' });
	const stats = getJournalStats(user.id);
	const tags = getTagsSummary(user.id);
	const onThisDay = getOnThisDayMemory(user.id);

	return {
		user,
		initialEntries: entries,
		stats,
		tags,
		onThisDay
	};
};
