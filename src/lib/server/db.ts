import { Pool } from 'pg';

const pools = new Map<string, Pool>();

export function createPool(databaseUrl: string): Pool {
	if (!pools.has(databaseUrl)) {
		const pool = new Pool({
			connectionString: databaseUrl,
			max: 10,
			connectionTimeoutMillis: 30000
		});
		pools.set(databaseUrl, pool);
	}
	return pools.get(databaseUrl)!;
}

export async function query<T = any>(
	pool: Pool,
	text: string,
	params?: any[]
): Promise<T[]> {
	const client = await pool.connect();
	try {
		const result = await client.query(text, params);
		return result.rows;
	} finally {
		client.release();
	}
}

export async function queryOne<T = any>(
	pool: Pool,
	text: string,
	params?: any[]
): Promise<T | null> {
	const rows = await query<T>(pool, text, params);
	return rows.length > 0 ? rows[0] : null;
}