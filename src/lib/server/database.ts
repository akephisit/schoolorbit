import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import { getConfig } from './config';

// Configure for Vercel serverless environment
const { databaseUrl } = getConfig();

export const db = drizzle(databaseUrl, { 
    schema,
    logger: process.env.NODE_ENV === 'development'
});

export type Database = typeof db;
