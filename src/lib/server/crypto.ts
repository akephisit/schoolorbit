import { createHash, randomBytes } from 'crypto';
import { NATIONAL_ID_SALT } from '$env/static/private';

// Use env-configured salt; default remains for backward compatibility
export function hashNationalId(nationalId: string, salt?: string): string {
    const effectiveSalt = salt ?? NATIONAL_ID_SALT ?? 'default_salt';
    const hasher = createHash('sha256');
    hasher.update(effectiveSalt);
    hasher.update(nationalId);
    return hasher.digest('hex');
}

export function generateSecureToken(): string {
	return randomBytes(32).toString('base64url');
}
