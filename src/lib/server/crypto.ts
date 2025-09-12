import { createHash, randomBytes } from 'crypto';

export function hashNationalId(nationalId: string, salt: string = 'default_salt'): string {
	const hasher = createHash('sha256');
	hasher.update(salt);
	hasher.update(nationalId);
	return hasher.digest('hex');
}

export function generateSecureToken(): string {
	return randomBytes(32).toString('base64url');
}