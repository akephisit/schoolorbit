import { pgTable, uuid, varchar, timestamp, date } from 'drizzle-orm/pg-core';
import { appUser } from './users';

export const position = pgTable('position', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  titleTh: varchar('title_th', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }), // management, teacher, staff, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const positionAssignment = pgTable('position_assignment', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
  positionId: uuid('position_id').notNull().references(() => position.id, { onDelete: 'cascade' }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type Position = typeof position.$inferSelect;
export type NewPosition = typeof position.$inferInsert;
export type PositionAssignment = typeof positionAssignment.$inferSelect;
export type NewPositionAssignment = typeof positionAssignment.$inferInsert;

