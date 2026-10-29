import crypto from 'node:crypto';

/**
 * Hash a plain-text password using native scrypt with a unique random salt
 */
export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16).toString('hex');
	const derivedKey = crypto.scryptSync(password, salt, 64);
	return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a plain-text password against a stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
	const [salt, key] = storedHash.split(':');
	if (!salt || !key) return false;

	const derivedKey = crypto.scryptSync(password, salt, 64);
	const keyBuffer = Buffer.from(key, 'hex');
	return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateSessionToken(): string {
	return crypto.randomBytes(32).toString('hex');
}
