import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { purgeAllTrash } from '#lib/server/db';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const count = purgeAllTrash(locals.user.id);
		return json({ success: true, count, message: `Purged ${count} entries from trash` });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to empty trash';
		return json({ error: message }, { status: 500 });
	}
};
