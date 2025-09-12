import { Pool } from 'pg';
import { hash, verify } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { generateSecureToken } from './crypto.js';
import { query, queryOne } from './db.js';

export interface AuthSession {
	id: string;
	user_id: string;
	refresh_hash: string;
	user_agent?: string;
	ip?: string;
	created_at: Date;
	rotated_at?: Date;
	expires_at: Date;
	revoked_at?: Date;
}

export class RefreshService {
	constructor(private pool: Pool) {}

	async createSession(
		userId: string,
		userAgent?: string,
		ip?: string
	): Promise<[string, string]> {
		const sessionId = uuidv4();
		const refreshToken = generateSecureToken();
		const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
		
		const refreshHash = await hash(refreshToken);

		await query(
			this.pool,
			`INSERT INTO auth_session (id, user_id, refresh_hash, user_agent, ip, expires_at)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[sessionId, userId, refreshHash, userAgent, ip, expiresAt]
		);

		return [sessionId, refreshToken];
	}

	async verifyAndRotate(refreshToken: string): Promise<[string, string]> {
		const sessions = await query<AuthSession>(
			this.pool,
			`SELECT id, user_id, refresh_hash, user_agent, ip, 
			        created_at, rotated_at, expires_at, revoked_at
			 FROM auth_session
			 WHERE revoked_at IS NULL AND expires_at > NOW()`
		);

		let matchingSession: AuthSession | null = null;
		
		for (const session of sessions) {
			try {
				if (await verify(session.refresh_hash, refreshToken)) {
					matchingSession = session;
					break;
				}
			} catch (error) {
				continue;
			}
		}

		if (!matchingSession) {
			throw new Error('Invalid or expired refresh token');
		}

		if (matchingSession.rotated_at) {
			await query(
				this.pool,
				'UPDATE auth_session SET revoked_at = NOW() WHERE user_id = $1',
				[matchingSession.user_id]
			);
			throw new Error('Token reuse detected - all sessions revoked');
		}

		const newRefreshToken = generateSecureToken();
		const newRefreshHash = await hash(newRefreshToken);

		await query(
			this.pool,
			`UPDATE auth_session 
			 SET rotated_at = NOW(), refresh_hash = $1
			 WHERE id = $2`,
			[newRefreshHash, matchingSession.id]
		);

		return [matchingSession.user_id, newRefreshToken];
	}

	async revokeSession(sessionId: string): Promise<void> {
		await query(
			this.pool,
			'UPDATE auth_session SET revoked_at = NOW() WHERE id = $1',
			[sessionId]
		);
	}

	async revokeUserSessions(userId: string): Promise<void> {
		await query(
			this.pool,
			'UPDATE auth_session SET revoked_at = NOW() WHERE user_id = $1',
			[userId]
		);
	}

	async cleanupExpired(): Promise<number> {
		const result = await query(
			this.pool,
			`DELETE FROM auth_session 
			 WHERE expires_at < NOW() OR revoked_at < NOW() - INTERVAL '7 days'`
		);
		return result.length;
	}
}