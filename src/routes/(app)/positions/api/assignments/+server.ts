import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { positionAssignment, appUser, position } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const posId = url.searchParams.get('positionId');
  const rows = await db
    .select({ id: positionAssignment.id, userId: positionAssignment.userId, positionId: positionAssignment.positionId, startDate: positionAssignment.startDate, endDate: positionAssignment.endDate, email: appUser.email, displayName: appUser.displayName })
    .from(positionAssignment)
    .innerJoin(appUser, eq(positionAssignment.userId, appUser.id))
    .where(posId ? eq(positionAssignment.positionId, posId) : undefined as any);
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const body = await request.json().catch(() => ({}));
  const positionId = (body.positionId || '').trim();
  const userEmail = typeof body.userEmail === 'string' ? body.userEmail.trim() : '';
  const startDate = body.startDate || null;
  const endDate = body.endDate || null;
  if (!positionId || !userEmail) return error(400, 'positionId และ userEmail ต้องระบุ');
  const usr = await db.select().from(appUser).where(eq(appUser.email, userEmail)).limit(1);
  if (!usr.length) return error(400, 'ไม่พบผู้ใช้ตามอีเมล');
  const ins = await db.insert(positionAssignment).values({ positionId, userId: usr[0].id, startDate, endDate } as any).returning({ id: positionAssignment.id });
  return json({ data: { id: ins[0].id } }, { status: 201 });
};

