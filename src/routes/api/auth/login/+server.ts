import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByUsername, createSession } from '#lib/server/db';
import { verifyPassword } from '#lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { username = '', password = '' } = body;

		if (!username.trim() || !password) {
			return json({ error: 'Username and password are required.' }, { status: 400 });
		}

		const userRecord = getUserByUsername(username.trim());
		if (!userRecord) {
			return json({ error: 'Invalid username or password.' }, { status: 401 });
		}

		const isValid = verifyPassword(password, userRecord.passwordHash);
		if (!isValid) {
			return json({ error: 'Invalid username or password.' }, { status: 401 });
		}

		// Create session
		const session = createSession(userRecord.id);

		cookies.set('journal_session', session.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false, // Local dev & intranet compatible
			maxAge: 30 * 24 * 60 * 60 // 30 days
		});

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { passwordHash: _, ...safeUser } = userRecord;

		return json({ user: safeUser });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Login failed';
		return json({ error: message }, { status: 500 });
	}
};
