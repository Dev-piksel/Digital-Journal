import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllUsersWithStats } from '#lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
	}

	const users = getAllUsersWithStats();
	return json({ users });
};
