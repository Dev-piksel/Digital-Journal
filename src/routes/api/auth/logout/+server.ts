import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '#lib/server/db';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('journal_session');
	if (token) {
		deleteSession(token);
		cookies.delete('journal_session', { path: '/' });
	}
	return json({ success: true, message: 'Logged out successfully' });
};
