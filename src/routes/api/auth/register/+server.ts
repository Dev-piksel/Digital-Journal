import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByUsername, createUser, createSession } from '#lib/server/db';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { username = '', password = '', displayName = '' } = body;

		const cleanUsername = username.trim().toLowerCase();
		if (!cleanUsername || cleanUsername.length < 3) {
			return json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
		}

		if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
			return json(
				{ error: 'Username can only contain letters, numbers, underscores, and hyphens.' },
				{ status: 400 }
			);
		}

		if (!password || password.length < 6) {
			return json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
		}

		const existing = getUserByUsername(cleanUsername);
		if (existing) {
			return json({ error: 'Username is already taken. Please choose another.' }, { status: 409 });
		}

		const newUser = createUser({
			username: cleanUsername,
			password,
			displayName: displayName.trim() || cleanUsername,
			role: 'user'
		});

		// Automatically log user in upon registration
		const session = createSession(newUser.id);

		cookies.set('journal_session', session.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			maxAge: 30 * 24 * 60 * 60
		});

		return json({ user: newUser }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Registration failed';
		return json({ error: message }, { status: 500 });
	}
};
