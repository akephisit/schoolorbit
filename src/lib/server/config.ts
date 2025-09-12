import { 
	DATABASE_URL, 
	JWT_SECRET, 
	COOKIE_DOMAIN, 
	CORS_ALLOWED_ORIGINS 
} from '$env/static/private';

export interface Config {
	databaseUrl: string;
	jwtSecret: string;
	cookieDomain?: string;
	corsAllowedOrigins: string[];
}

export function getConfig(): Config {
	const databaseUrl = DATABASE_URL ?? 'postgres://localhost:5432/schoolorbit';
	const jwtSecret = JWT_SECRET ?? 'dev_32bytes_minimum_secret________________________________';
	const cookieDomain = COOKIE_DOMAIN || undefined;
	const corsOrigins = CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173';
	const corsAllowedOrigins = corsOrigins.split(',').map(s => s.trim());

	return {
		databaseUrl,
		jwtSecret,
		cookieDomain,
		corsAllowedOrigins
	};
}