import { hash, verify } from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, gt, lt, isNull } from 'drizzle-orm';
import { generateSecureToken } from './crypto.js';
import { db, type Database } from './database.js';
import { refreshSession } from './schema';

export class RefreshService {
	constructor(private database: Database = db) {}

	async createSession(
		userId: string,
		userAgent?: string,
		ip?: string
	): Promise<[string, string]> {
		const sessionId = uuidv4();
		const refreshToken = generateSecureToken();
		const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
		
		const refreshHash = await hash(refreshToken);

		await this.database.insert(refreshSession).values({
			id: sessionId,
			userId,
			tokenHash: refreshHash,
			userAgent,
			ipAddress: ip,
			expiresAt
		});

		return [sessionId, refreshToken];
	}

	async verifyAndRotate(refreshToken: string): Promise<[string, string]> {
		const refreshHash = await hash(refreshToken);
		
		const sessions = await this.database
			.select()
			.from(refreshSession)
			.where(
				and(
					eq(refreshSession.tokenHash, refreshHash),
					gt(refreshSession.expiresAt, new Date()),
					isNull(refreshSession.updatedAt) // not rotated
				)
			);

		if (sessions.length === 0) {
			throw new Error('Invalid refresh token');
		}

		const session = sessions[0];
		
		// Generate new refresh token
		const newRefreshToken = generateSecureToken();
		const newRefreshHash = await hash(newRefreshToken);

		// Update session with new token and mark as rotated
		await this.database
			.update(refreshSession)
			.set({
				tokenHash: newRefreshHash,
				updatedAt: new Date()
			})
			.where(eq(refreshSession.id, session.id));

		return [session.userId, newRefreshToken];
	}

	async revokeSession(sessionId: string): Promise<void> {
		await this.database
			.delete(refreshSession)
			.where(eq(refreshSession.id, sessionId));
	}

	async revokeUserSessions(userId: string): Promise<void> {
		await this.database
			.delete(refreshSession)
			.where(eq(refreshSession.userId, userId));
	}

	async cleanupExpired(): Promise<number> {
		const result = await this.database
			.delete(refreshSession)
			.where(lt(refreshSession.expiresAt, new Date()));

		return result.rowCount || 0;
	}
}