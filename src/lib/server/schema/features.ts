import { pgTable, uuid, varchar, boolean, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { appUser } from './users';

export const featureToggle = pgTable(
	'feature_toggle',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		enabled: boolean('enabled').notNull().default(true),
		updatedBy: uuid('updated_by').references(() => appUser.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => ({
		codeUnique: uniqueIndex('feature_toggle_code_unique').on(t.code)
	})
);

export type FeatureToggle = typeof featureToggle.$inferSelect;
export type NewFeatureToggle = typeof featureToggle.$inferInsert;
