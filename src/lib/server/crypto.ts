import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
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

function getEncKey(): Buffer {
  const keyB64 = env.NATIONAL_ID_ENC_KEY;
  if (keyB64) {
    try { return Buffer.from(keyB64, 'base64'); } catch {}
  }
  // Derive 32-byte key from salt as fallback (dev only)
  const salt = env.NATIONAL_ID_SALT ?? 'default_salt';
  const h = createHash('sha256');
  h.update('enc-key');
  h.update(salt);
  return h.digest();
}

export function encryptPII(plaintext: string): string {
  const key = getEncKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), ct.toString('base64'), tag.toString('base64')].join('.');
}

export function decryptPII(payload: string): string {
  const [ivB64, ctB64, tagB64] = payload.split('.');
  const key = getEncKey();
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export function maskNationalId(nid: string): string {
  // Thai national ID: 13 digits
  const digits = nid.replace(/\D/g, '');
  if (digits.length !== 13) return nid.replace(/.(?=.{2})/g, 'x');
  return `${digits[0]}-${digits.slice(1,5).replace(/\d/g,'x')}-${digits.slice(5,10).replace(/\d/g,'x')}-${digits.slice(10,12).replace(/\d/g,'x')}-${digits[12]}`;
}
