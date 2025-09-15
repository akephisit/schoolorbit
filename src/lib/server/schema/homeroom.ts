import { pgTable, uuid, varchar, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core';
import { appUser } from './users';

export const homeroomAssignment = pgTable('homeroom_assignment', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
  classCode: varchar('class_code', { length: 64 }).notNull(), // e.g., 'ม.6/1' or internal code
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => ({
  classUnique: uniqueIndex('homeroom_class_unique').on(t.classCode)
}));

export type HomeroomAssignment = typeof homeroomAssignment.$inferSelect;
export type NewHomeroomAssignment = typeof homeroomAssignment.$inferInsert;
