export interface Config {
	databaseUrl: string;
	jwtSecret: string;
	cookieDomain?: string;
	corsAllowedOrigins: string[];
	port: number;
	aesKey: Uint8Array;
}

export function getConfig(): Config {
	const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/schoolorbit';
	const jwtSecret = process.env.JWT_SECRET ?? 'dev_32bytes_minimum_secret________________________________';
	const cookieDomain = process.env.COOKIE_DOMAIN;
	const corsOrigins = process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173';
	const corsAllowedOrigins = corsOrigins.split(',').map(s => s.trim());
	const port = parseInt(process.env.PORT ?? '8787');
	
	const aesKeyHex = process.env.AES_KEY_HEX ?? '32bytes_hex_for_AESGCM_encrypt_NID';
	let aesKey: Uint8Array;
	
	if (aesKeyHex.length === 64) {
		aesKey = new Uint8Array(32);
		for (let i = 0; i < 32; i++) {
			aesKey[i] = parseInt(aesKeyHex.slice(i * 2, i * 2 + 2), 16);
		}
	} else {
		aesKey = new Uint8Array(32);
		const bytes = new TextEncoder().encode(aesKeyHex);
		const len = Math.min(bytes.length, 32);
		aesKey.set(bytes.slice(0, len));
	}

	return {
		databaseUrl,
		jwtSecret,
		cookieDomain,
		corsAllowedOrigins,
		port,
		aesKey
	};
}