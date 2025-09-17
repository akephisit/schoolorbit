import { pgTable, uuid, varchar, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

export const appUser = pgTable(
    'app_user',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        email: varchar('email', { length: 255 }).unique(),
        displayName: varchar('display_name', { length: 255 }).notNull(),
        title: varchar('title', { length: 32 }),
        firstName: varchar('first_name', { length: 100 }),
        lastName: varchar('last_name', { length: 100 }),
        passwordHash: varchar('password_hash', { length: 255 }),
        // Centralized national ID (hash for lookup, enc for PII display)
        nationalIdHash: varchar('national_id_hash', { length: 64 }).notNull(),
        nationalIdEnc: varchar('national_id_enc', { length: 1024 }),
        status: userStatusEnum('status').notNull().default('active'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow()
    },
    (t) => ({
        nationalIdUnique: uniqueIndex('app_user_national_id_hash_unique').on(t.nationalIdHash)
    })
);

export const personnelProfile = pgTable('personnel_profile', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    position: varchar('position', { length: 100 }),
    department: varchar('department', { length: 100 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => ({
    personnelUserUnique: uniqueIndex('personnel_profile_user_unique').on(t.userId)
}));

export const studentProfile = pgTable('student_profile', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    studentCode: varchar('student_code', { length: 50 }).unique(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    grade: varchar('grade', { length: 10 }),
    classroom: varchar('classroom', { length: 20 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => ({
    studentUserUnique: uniqueIndex('student_profile_user_unique').on(t.userId)
}));

export const guardianProfile = pgTable('guardian_profile', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    phoneNumber: varchar('phone_number', { length: 20 }),
    relation: varchar('relation', { length: 50 }), // father, mother, guardian, etc.
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => ({
    guardianUserUnique: uniqueIndex('guardian_profile_user_unique').on(t.userId)
}));

export type AppUser = typeof appUser.$inferSelect;
export type NewAppUser = typeof appUser.$inferInsert;
export type PersonnelProfile = typeof personnelProfile.$inferSelect;
export type NewPersonnelProfile = typeof personnelProfile.$inferInsert;
export type StudentProfile = typeof studentProfile.$inferSelect;
export type NewStudentProfile = typeof studentProfile.$inferInsert;
export type GuardianProfile = typeof guardianProfile.$inferSelect;
export type NewGuardianProfile = typeof guardianProfile.$inferInsert;
