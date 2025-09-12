import { drizzle } from 'drizzle-orm/neon-serverless';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

export const db = drizzle(DATABASE_URL, { schema });

export type Database = typeof db;