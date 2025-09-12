export interface CookieConfig {
	secure: boolean;
}

export function createCookieConfig(): CookieConfig {
	return {
		secure: false // Always false for single domain development
	};
}

export function createAccessTokenCookie(token: string, config: CookieConfig): string {
	let cookie = `at=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${15 * 60}`;
	
	if (config.secure) {
		cookie += '; Secure';
	}
	
	return cookie;
}

export function createRefreshTokenCookie(token: string, config: CookieConfig): string {
	let cookie = `rt=${token}; HttpOnly; SameSite=Strict; Path=/auth; Max-Age=${14 * 24 * 60 * 60}`;
	
	if (config.secure) {
		cookie += '; Secure';
	}
	
	return cookie;
}

export function createCsrfCookie(token: string, config: CookieConfig): string {
	let cookie = `csrf=${token}; SameSite=Strict; Path=/; Max-Age=${60 * 60}`;
	
	if (config.secure) {
		cookie += '; Secure';
	}
	
	return cookie;
}

export function clearAuthCookies(_config: CookieConfig): string[] {
	return [
		'at=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
		'rt=; HttpOnly; SameSite=Strict; Path=/auth; Max-Age=0',
		'csrf=; SameSite=Strict; Path=/; Max-Age=0'
	];
}