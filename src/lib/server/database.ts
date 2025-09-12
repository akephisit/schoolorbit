import { drizzle } from 'drizzle-orm/neon-serverless';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

// Configure for Vercel serverless environment
export const db = drizzle(DATABASE_URL, { 
	schema,
	logger: process.env.NODE_ENV === 'development'
});

export type Database = typeof db;