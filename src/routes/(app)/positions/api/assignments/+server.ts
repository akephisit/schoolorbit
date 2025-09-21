import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { positionAssignment, appUser, position } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseAssignmentCreateInput, parseAssignmentListQuery } from '$lib/server/validators/positions';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const GET: RequestHandler = async ({ locals, url }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'position-management');
  const query = parseAssignmentListQuery(url.searchParams);
  if (!query) {
    return validationError({
      message: 'positionId ไม่ถูกต้อง',
      fieldErrors: { positionId: ['positionId ไม่ถูกต้อง'] }
    });
  }
  const { positionId: posId } = query;
  const rows = await db
    .select({ id: positionAssignment.id, userId: positionAssignment.userId, positionId: positionAssignment.positionId, email: appUser.email, displayName: appUser.displayName })
    .from(positionAssignment)
    .innerJoin(appUser, eq(positionAssignment.userId, appUser.id))
    .where(posId ? eq(positionAssignment.positionId, posId) : undefined as any);
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'position-management');
  const body = await request.json().catch(() => ({}));
  const parsed = parseAssignmentCreateInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const { positionId, userEmail } = parsed.data;
  const usr = await db.select().from(appUser).where(eq(appUser.email, userEmail)).limit(1);
  if (!usr.length) {
    return validationError({
      message: 'ไม่พบผู้ใช้ตามอีเมล',
      fieldErrors: { userEmail: ['ไม่พบผู้ใช้ตามอีเมล'] }
    });
  }
  const ins = await db.insert(positionAssignment).values({ positionId, userId: usr[0].id } as any).returning({ id: positionAssignment.id });
  return json({ data: { id: ins[0].id } }, { status: 201 });
};
