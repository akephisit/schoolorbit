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
        const tokenSecret = generateSecureToken();
        const refreshToken = `${sessionId}.${tokenSecret}`; // embed session id for O(1) lookup
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

        const refreshHash = await hash(tokenSecret);

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
        // Preferred fast path: token format "<sessionId>.<secret>"
        const dot = refreshToken.indexOf('.')
        if (dot > 0) {
            const sessionId = refreshToken.slice(0, dot);
            const secret = refreshToken.slice(dot + 1);

            const rows = await this.database
                .select()
                .from(refreshSession)
                .where(and(eq(refreshSession.id, sessionId), gt(refreshSession.expiresAt, new Date())));

            if (!rows.length) {
                throw new Error('Invalid refresh token');
            }
            const s = rows[0];
            const ok = await verify(s.tokenHash, secret);
            if (!ok) {
                throw new Error('Invalid refresh token');
            }

            const newSecret = generateSecureToken();
            const newRefreshToken = `${sessionId}.${newSecret}`;
            const newHash = await hash(newSecret);

            await this.database
                .update(refreshSession)
                .set({ tokenHash: newHash, updatedAt: new Date() })
                .where(eq(refreshSession.id, sessionId));

            return [s.userId, newRefreshToken];
        }

        // Legacy fallback: tokens generated before embedding session id
        const candidates = await this.database
            .select()
            .from(refreshSession)
            .where(gt(refreshSession.expiresAt, new Date()));

        for (const s of candidates) {
            if (await verify(s.tokenHash, refreshToken)) {
                const newSecret = generateSecureToken();
                const newRefreshToken = `${s.id}.${newSecret}`;
                const newHash = await hash(newSecret);

                await this.database
                    .update(refreshSession)
                    .set({ tokenHash: newHash, updatedAt: new Date() })
                    .where(eq(refreshSession.id, s.id));

                return [s.userId, newRefreshToken];
            }
        }
        throw new Error('Invalid refresh token');
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
