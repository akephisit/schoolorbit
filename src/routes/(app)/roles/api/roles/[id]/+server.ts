import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { role } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseRoleUpdateInput } from '$lib/server/validators/roles';
import { assertFeatureEnabled } from '$lib/server/features';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'role-management');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const parsed = parseRoleUpdateInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const { name } = parsed.data;
  // Protect base roles from being renamed
  const rows = await db.select().from(role).where(eq(role.id, id)).limit(1);
  if (!rows.length) return error(404, 'ไม่พบบทบาท');
  const base = new Set(['staff', 'student', 'parent']);
  // @ts-ignore drizzle type narrow
  if (base.has(String(rows[0].code))) {
    return error(403, 'ห้ามแก้ไขชื่อบทบาทพื้นฐานของระบบ');
  }
  await db.update(role).set({ name }).where(eq(role.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'role-management');
  const id = params.id;
  // Protect base roles from deletion
  const rows = await db.select().from(role).where(eq(role.id, id)).limit(1);
  if (!rows.length) return error(404, 'ไม่พบบทบาท');
  const base = new Set(['staff', 'student', 'parent']);
  // @ts-ignore drizzle types inference
  if (base.has(String(rows[0].code))) {
    return error(403, 'ห้ามลบบทบาทพื้นฐานของระบบ');
  }
  await db.delete(role).where(eq(role.id, id));
  return json({ ok: true });
};
