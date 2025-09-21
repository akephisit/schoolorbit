import {
	pgTable,
	uuid,
	varchar,
	boolean,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
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

export const featureState = pgTable(
	'feature_state',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		featureCode: varchar('feature_code', { length: 64 }).notNull(),
		stateCode: varchar('state_code', { length: 64 }).notNull(),
		value: boolean('value').notNull().default(false),
		updatedBy: uuid('updated_by').references(() => appUser.id, { onDelete: 'set null' }),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => ({
		featureStateUnique: uniqueIndex('feature_state_feature_code_state_code_unique').on(
			t.featureCode,
			t.stateCode
		)
	})
);

export type FeatureState = typeof featureState.$inferSelect;
export type NewFeatureState = typeof featureState.$inferInsert;
