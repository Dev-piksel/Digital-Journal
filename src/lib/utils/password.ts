/**
 * Password validation and strength utilities
 */

export interface PasswordRequirements {
	minLength: boolean;
	hasLower: boolean;
	hasUpper: boolean;
	hasNumber: boolean;
	hasSpecial: boolean;
}

export function checkPasswordRequirements(password: string): PasswordRequirements {
	return {
		minLength: password.length >= 8,
		hasLower: /[a-z]/.test(password),
		hasUpper: /[A-Z]/.test(password),
		hasNumber: /[0-9]/.test(password),
		hasSpecial: /[^a-zA-Z0-9\s]/.test(password)
	};
}

export function isPasswordValid(password: string): boolean {
	const reqs = checkPasswordRequirements(password);
	return reqs.minLength && reqs.hasLower && reqs.hasUpper && reqs.hasNumber && reqs.hasSpecial;
}

export function getPasswordValidationErrorMessage(password: string): string | null {
	const reqs = checkPasswordRequirements(password);
	if (!reqs.minLength) return 'Password must be at least 8 characters long.';
	if (!reqs.hasUpper) return 'Password must contain at least one uppercase letter (A-Z).';
	if (!reqs.hasLower) return 'Password must contain at least one lowercase letter (a-z).';
	if (!reqs.hasNumber) return 'Password must contain at least one number (0-9).';
	if (!reqs.hasSpecial) return 'Password must contain at least one special symbol (e.g. !@#$%^&*).';
	return null;
}

export interface PasswordStrength {
	score: number;
	label: string;
	color: string;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
	if (!password) {
		return { score: 0, label: '', color: '' };
	}

	const reqs = checkPasswordRequirements(password);
	let score = 0;
	if (reqs.minLength) score++;
	if (reqs.hasLower) score++;
	if (reqs.hasUpper) score++;
	if (reqs.hasNumber) score++;
	if (reqs.hasSpecial) score++;

	if (score <= 2) {
		return { score: Math.max(score, 1), label: 'Weak', color: '#ef4444' };
	} else if (score === 3) {
		return { score, label: 'Fair', color: '#f59e0b' };
	} else if (score === 4) {
		return { score, label: 'Good', color: '#eab308' };
	} else {
		if (password.length >= 12) {
			return { score: 5, label: 'Very Strong', color: '#10b981' };
		}
		return { score: 5, label: 'Strong', color: '#22c55e' };
	}
}

