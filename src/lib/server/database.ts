import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { getConfig } from './config';

// Configure for Vercel serverless environment
const { databaseUrl } = getConfig();

// Neon fetch connection cache is enabled by default in recent versions

const client = neon(databaseUrl);

export const db = drizzle(client, { 
    schema,
    logger: process.env.NODE_ENV === 'development'
});

export type Database = typeof db;
