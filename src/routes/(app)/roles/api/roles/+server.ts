import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { role } from '$lib/server/schema';
import { assertFeatureEnabled } from '$lib/server/features';
import { and, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'role-management');
  const rows = await db.select().from(role);
  return json({ data: rows.map(r => ({ id: r.id, code: r.code, name: r.name })) });
};

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  return error(403, 'ปิดการสร้างบทบาทใหม่: ระบบใช้เฉพาะ staff/student/parent');
};
