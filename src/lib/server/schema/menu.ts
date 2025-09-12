import { pgTable, uuid, varchar, text, json, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const menuItem = pgTable('menu_item', {
	id: uuid('id').primaryKey().defaultRandom(),
	label: varchar('label', { length: 100 }).notNull(),
	href: varchar('href', { length: 255 }).notNull(),
	icon: varchar('icon', { length: 50 }).notNull(),
	description: text('description'),
	sortOrder: integer('sort_order').notNull().default(0),
	isActive: boolean('is_active').notNull().default(true),
	requiredPermissions: json('required_permissions').$type<string[]>(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type MenuItem = typeof menuItem.$inferSelect;
export type NewMenuItem = typeof menuItem.$inferInsert;