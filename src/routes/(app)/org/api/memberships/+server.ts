import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgMembership, orgUnit, appUser } from '$lib/server/schema';
import { and, eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseMembershipCreateInput, parseMembershipListQuery } from '$lib/server/validators/org';
import { assertFeatureEnabled } from '$lib/server/features';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'org-management');
  const query = parseMembershipListQuery(url.searchParams);
  if (!query) {
    return validationError({
      message: 'unitId จำเป็น',
      fieldErrors: { unitId: ['unitId จำเป็น'] }
    });
  }
  const { unitId } = query;
  const rows = await db
    .select({ id: orgMembership.id, userId: orgMembership.userId, roleInUnit: orgMembership.roleInUnit, displayName: appUser.displayName, email: appUser.email })
    .from(orgMembership)
    .innerJoin(appUser, eq(orgMembership.userId, appUser.id))
    .where(eq(orgMembership.orgUnitId, unitId));
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'org-management');
  const body = await request.json().catch(() => ({}));
  const parsed = parseMembershipCreateInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const { unitId, userEmail, roleInUnit } = parsed.data;
  const user = await db.select().from(appUser).where(eq(appUser.email, userEmail)).limit(1);
  if (!user.length) {
    return validationError({
      message: 'ไม่พบผู้ใช้ตามอีเมล',
      fieldErrors: { userEmail: ['ไม่พบผู้ใช้ตามอีเมล'] }
    });
  }
  const ins = await db.insert(orgMembership).values({ orgUnitId: unitId, userId: user[0].id, roleInUnit } as any).returning({ id: orgMembership.id });
  return json({ data: { id: ins[0].id } }, { status: 201 });
};
