import type { Handle } from '@sveltejs/kit/hooks';
import { validateSession, deleteSession } from '#lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('journal_session');

	if (!sessionToken) {
		event.locals.user = null;
		return resolve(event);
	}

	const user = validateSession(sessionToken);

	if (user) {
		event.locals.user = user;
	} else {
		event.locals.user = null;
		event.cookies.delete('journal_session', { path: '/' });
	}

	return resolve(event);
};
