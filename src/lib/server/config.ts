import { 
	DATABASE_URL, 
	JWT_SECRET
} from '$env/static/private';

export interface Config {
	databaseUrl: string;
	jwtSecret: string;
}

export function getConfig(): Config {
	const databaseUrl = DATABASE_URL ?? 'postgres://localhost:5432/schoolorbit';
	const jwtSecret = JWT_SECRET ?? 'dev_32bytes_minimum_secret________________________________';

	return {
		databaseUrl,
		jwtSecret
	};
}