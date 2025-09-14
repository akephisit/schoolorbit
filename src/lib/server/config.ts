import { env } from '$env/dynamic/private';

export interface Config {
	databaseUrl: string;
	jwtSecret: string;
}

export function getConfig(): Config {
    const databaseUrl = env.DATABASE_URL ?? 'postgres://localhost:5432/schoolorbit';
    const jwtSecret = env.JWT_SECRET ?? 'dev_32bytes_minimum_secret________________________________';

	return {
		databaseUrl,
		jwtSecret
	};
}
