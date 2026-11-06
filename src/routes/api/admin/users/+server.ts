import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllUsersWithStats, getUserByUsername, createUser } from '#lib/server/db';
import type { UserRole } from '#lib/types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
	}

	const users = getAllUsersWithStats();
	return json({ users });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { username = '', password = '', displayName = '', role = 'user' } = body;

		const cleanUsername = String(username).trim().toLowerCase();
		if (!cleanUsername || cleanUsername.length < 3) {
			return json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
		}

		if (!/^[a-zA-Z0-9._@+-]+$/.test(cleanUsername)) {
			return json(
				{ error: 'Username can only contain letters, numbers, and . _ @ + - characters.' },
				{ status: 400 }
			);
		}

		if (!password || String(password).length < 6) {
			return json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
		}

		if (role !== 'admin' && role !== 'user') {
			return json({ error: 'Invalid role. Must be "admin" or "user".' }, { status: 400 });
		}

		const existing = getUserByUsername(cleanUsername);
		if (existing) {
			return json({ error: 'Username is already taken. Please choose another.' }, { status: 409 });
		}

		const newUser = createUser({
			username: cleanUsername,
			password: String(password),
			displayName: String(displayName).trim() || cleanUsername,
			role: role as UserRole
		});

		return json({ success: true, user: newUser }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to create user account';
		return json({ error: message }, { status: 500 });
	}
};
