import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { appUser } from './users';

export const refreshSession = pgTable('refresh_session', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
	tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
	userAgent: text('user_agent'),
	ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type RefreshSession = typeof refreshSession.$inferSelect;
export type NewRefreshSession = typeof refreshSession.$inferInsert;