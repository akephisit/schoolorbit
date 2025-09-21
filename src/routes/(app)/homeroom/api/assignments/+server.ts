import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { homeroomAssignment, appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseHomeroomAssignmentCreate } from '$lib/server/validators/homeroom';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const GET: RequestHandler = async ({ locals }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'homeroom');
  const rows = await db
    .select({ id: homeroomAssignment.id, classCode: homeroomAssignment.classCode, teacherId: homeroomAssignment.teacherId, email: appUser.email, displayName: appUser.displayName })
    .from(homeroomAssignment)
    .innerJoin(appUser, eq(homeroomAssignment.teacherId, appUser.id));
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'homeroom');
  const body = await request.json().catch(() => ({}));
  const parsed = parseHomeroomAssignmentCreate(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const { classCode, teacherEmail } = parsed.data;
  const usr = await db.select().from(appUser).where(eq(appUser.email, teacherEmail)).limit(1);
  if (!usr.length) {
    return validationError({
      message: 'ไม่พบผู้ใช้ตามอีเมล',
      fieldErrors: { teacherEmail: ['ไม่พบผู้ใช้ตามอีเมล'] }
    });
  }
  const ins = await db
    .insert(homeroomAssignment)
    .values({ classCode, teacherId: usr[0].id } as any)
    .returning({ id: homeroomAssignment.id });
  return json({ data: { id: ins[0].id } }, { status: 201 });
};
