import { pgTable, uuid, varchar, timestamp, pgEnum, date, foreignKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { appUser } from './users';

export const orgUnit = pgTable(
  'org_unit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    nameTh: varchar('name_th', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }), // division, department, committee, etc.
    parentId: uuid('parent_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (t) => ({
    parentFk: foreignKey({ columns: [t.parentId], foreignColumns: [t.id] }).onDelete('set null')
  })
);

export const membershipRoleEnum = pgEnum('membership_role', ['head', 'deputy', 'member']);

export const orgMembership = pgTable('org_membership', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => appUser.id, { onDelete: 'cascade' }),
  orgUnitId: uuid('org_unit_id').notNull().references(() => orgUnit.id, { onDelete: 'cascade' }),
  roleInUnit: membershipRoleEnum('role_in_unit').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (t) => ({
  orgUnitUserUnique: uniqueIndex('org_membership_unit_user_unique').on(t.orgUnitId, t.userId)
}));

export type OrgUnit = typeof orgUnit.$inferSelect;
export type NewOrgUnit = typeof orgUnit.$inferInsert;
export type OrgMembership = typeof orgMembership.$inferSelect;
export type NewOrgMembership = typeof orgMembership.$inferInsert;
