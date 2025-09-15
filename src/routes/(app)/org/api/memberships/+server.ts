import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgMembership, orgUnit, appUser } from '$lib/server/schema';
import { and, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const unitId = url.searchParams.get('unitId');
  if (!unitId) return error(400, 'unitId จำเป็น');
  const rows = await db
    .select({ id: orgMembership.id, userId: orgMembership.userId, roleInUnit: orgMembership.roleInUnit, displayName: appUser.displayName, email: appUser.email })
    .from(orgMembership)
    .innerJoin(appUser, eq(orgMembership.userId, appUser.id))
    .where(eq(orgMembership.orgUnitId, unitId));
  return json({ data: rows });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const body = await request.json().catch(() => ({}));
  const unitId = (body.unitId || '').trim();
  const userEmail = typeof body.userEmail === 'string' ? body.userEmail.trim() : '';
  const roleInUnit = (body.roleInUnit || 'member') as 'head'|'deputy'|'member';
  if (!unitId || !userEmail) return error(400, 'unitId และ userEmail ต้องระบุ');
  const user = await db.select().from(appUser).where(eq(appUser.email, userEmail)).limit(1);
  if (!user.length) return error(400, 'ไม่พบผู้ใช้ตามอีเมล');
  const ins = await db.insert(orgMembership).values({ orgUnitId: unitId, userId: user[0].id, roleInUnit } as any).returning({ id: orgMembership.id });
  return json({ data: { id: ins[0].id } }, { status: 201 });
};
