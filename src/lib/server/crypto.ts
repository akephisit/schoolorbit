import { createHash, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

// Use env-configured salt; default remains for backward compatibility
export function hashNationalId(nationalId: string, salt?: string): string {
    const effectiveSalt = salt ?? env.NATIONAL_ID_SALT ?? 'default_salt';
    const hasher = createHash('sha256');
    hasher.update(effectiveSalt);
    hasher.update(nationalId);
    return hasher.digest('hex');
}

export function generateSecureToken(): string {
	return randomBytes(32).toString('base64url');
}
