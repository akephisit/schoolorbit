import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { homeroomAssignment, appUser } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const rows = await db
    .select({ id: homeroomAssignment.id, classCode: homeroomAssignment.classCode, startDate: homeroomAssignment.startDate, endDate: homeroomAssignment.endDate, teacherId: homeroomAssignment.teacherId, email: appUser.email, displayName: appUser.displayName })
    .from(homeroomAssignment)
    .innerJoin(appUser, eq(homeroomAssignment.teacherId, appUser.id));
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const body = await request.json().catch(() => ({}));
  const classCode = (body.classCode || '').trim();
  const teacherEmail = typeof body.teacherEmail === 'string' ? body.teacherEmail.trim() : '';
  const startDate = body.startDate || null;
  const endDate = body.endDate || null;
  if (!classCode || !teacherEmail) return error(400, 'classCode และ teacherEmail ต้องระบุ');
  const usr = await db.select().from(appUser).where(eq(appUser.email, teacherEmail)).limit(1);
  if (!usr.length) return error(400, 'ไม่พบผู้ใช้ตามอีเมล');
  const ins = await db.insert(homeroomAssignment).values({ classCode, teacherId: usr[0].id, startDate, endDate } as any).returning({ id: homeroomAssignment.id });
  return json({ data: { id: ins[0].id } }, { status: 201 });
};

