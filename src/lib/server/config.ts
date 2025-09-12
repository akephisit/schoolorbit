export interface Config {
	databaseUrl: string;
	jwtSecret: string;
	cookieDomain?: string;
	corsAllowedOrigins: string[];
}

export function getConfig(): Config {
	const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost:5432/schoolorbit';
	const jwtSecret = process.env.JWT_SECRET ?? 'dev_32bytes_minimum_secret________________________________';
	const cookieDomain = process.env.COOKIE_DOMAIN;
	const corsOrigins = process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173';
	const corsAllowedOrigins = corsOrigins.split(',').map(s => s.trim());

	return {
		databaseUrl,
		jwtSecret,
		cookieDomain,
		corsAllowedOrigins
	};
}