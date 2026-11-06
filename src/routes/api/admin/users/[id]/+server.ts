import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserById, updateUser, deleteUser, db } from '#lib/server/db';
import type { UserRole } from '#lib/types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
	}

	try {
		const targetUser = getUserById(params.id);
		if (!targetUser) {
			return json({ error: 'User not found.' }, { status: 404 });
		}

		const body = await request.json();
		const { displayName, role } = body;

		if (role !== undefined && role !== 'admin' && role !== 'user') {
			return json({ error: 'Invalid role. Must be "admin" or "user".' }, { status: 400 });
		}

		// Prevent admin from demoting themselves
		if (params.id === locals.user.id && role === 'user') {
			return json({ error: 'You cannot demote your own account from Administrator.' }, { status: 400 });
		}

		// If demoting an admin, ensure they are not the last remaining admin
		if (role === 'user' && targetUser.role === 'admin') {
			const adminCountRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as {
				count: number;
			};
			if (adminCountRow.count <= 1) {
				return json({ error: 'Cannot demote the last remaining administrator in the system.' }, { status: 400 });
			}
		}

		const updatedUser = updateUser(params.id, {
			displayName: typeof displayName === 'string' ? displayName.trim() : undefined,
			role: role as UserRole | undefined
		});

		if (!updatedUser) {
			return json({ error: 'Failed to update user.' }, { status: 500 });
		}

		return json({
			success: true,
			user: updatedUser,
			message: `Account for @${updatedUser.username} updated successfully.`
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to update user';
		return json({ error: message }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
	}

	try {
		const targetUser = getUserById(params.id);
		if (!targetUser) {
			return json({ error: 'User not found.' }, { status: 404 });
		}

		// Prevent admin from deleting their own account
		if (params.id === locals.user.id) {
			return json({ error: 'You cannot delete your own account.' }, { status: 400 });
		}

		// If deleting an admin, ensure they are not the last remaining admin
		if (targetUser.role === 'admin') {
			const adminCountRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as {
				count: number;
			};
			if (adminCountRow.count <= 1) {
				return json({ error: 'Cannot delete the last remaining administrator in the system.' }, { status: 400 });
			}
		}

		const success = deleteUser(params.id);
		if (!success) {
			return json({ error: 'Failed to delete user.' }, { status: 500 });
		}

		return json({
			success: true,
			message: `Account for @${targetUser.username} and all associated entries deleted.`
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to delete user';
		return json({ error: message }, { status: 500 });
	}
};
