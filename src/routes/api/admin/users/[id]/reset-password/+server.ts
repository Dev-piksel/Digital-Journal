import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserById, adminResetUserPassword } from '#lib/server/db';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
	}

	try {
		const targetUser = getUserById(params.id);
		if (!targetUser) {
			return json({ error: 'User not found.' }, { status: 404 });
		}

		const body = await request.json();
		const { newPassword } = body;

		if (!newPassword || newPassword.length < 6) {
			return json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
		}

		const success = adminResetUserPassword(params.id, newPassword);
		if (!success) {
			return json({ error: 'Failed to update user password.' }, { status: 500 });
		}

		return json({
			success: true,
			message: `Password for ${targetUser.username} (${targetUser.displayName}) has been successfully updated.`
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to reset password';
		return json({ error: message }, { status: 500 });
	}
};
