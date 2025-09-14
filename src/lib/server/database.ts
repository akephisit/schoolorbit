import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';
import { getConfig } from './config';

// Configure for Vercel serverless environment
const { databaseUrl } = getConfig();

// Improve performance and stability on serverless (Vercel)
neonConfig.fetchConnectionCache = true;

const client = neon(databaseUrl);

export const db = drizzle(client, { 
    schema,
    logger: process.env.NODE_ENV === 'development'
});

export type Database = typeof db;
