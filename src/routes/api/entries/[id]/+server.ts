import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getEntryById,
	updateEntry,
	softDeleteEntry,
	restoreEntry,
	deletePermanently
} from '#lib/server/db';
import type { MoodType } from '#lib/types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const entry = getEntryById(params.id, locals.user.id);
	if (!entry) {
		return json({ error: 'Entry not found' }, { status: 404 });
	}
	return json({ entry });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { title, content, mood, tags } = body;

		const updated = updateEntry(params.id, locals.user.id, {
			title,
			content,
			mood: mood as MoodType | undefined,
			tags: Array.isArray(tags) ? tags : undefined
		});

		if (!updated) {
			return json({ error: 'Entry not found' }, { status: 404 });
		}

		return json({ entry: updated });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to update entry';
		return json({ error: message }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { action } = body;

		if (action === 'trash') {
			const success = softDeleteEntry(params.id, locals.user.id);
			if (!success) return json({ error: 'Entry not found' }, { status: 404 });
			return json({ success: true, message: 'Moved to trash' });
		} else if (action === 'restore') {
			const success = restoreEntry(params.id, locals.user.id);
			if (!success) return json({ error: 'Entry not found' }, { status: 404 });
			return json({ success: true, message: 'Restored from trash' });
		}

		return json({ error: 'Invalid action. Expected "trash" or "restore"' }, { status: 400 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to update entry';
		return json({ error: message }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const success = deletePermanently(params.id, locals.user.id);
	if (!success) {
		return json({ error: 'Entry not found' }, { status: 404 });
	}
	return json({ success: true, message: 'Deleted permanently' });
};
