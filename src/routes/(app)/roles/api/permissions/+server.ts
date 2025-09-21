import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { permission } from '$lib/server/schema';
import { validationError } from '$lib/server/validators/core';
import { parsePermissionCreateInput } from '$lib/server/validators/roles';
import { assertFeatureEnabled } from '$lib/server/features';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'role-management');
  const rows = await db.select().from(permission);
  return json({ data: rows.map(p => ({ id: p.id, code: p.code, name: p.name })) });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'role-management');
  const body = await request.json().catch(() => ({}));
  const parsed = parsePermissionCreateInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const { code, name } = parsed.data;
  try {
    const ins = await db.insert(permission).values({ code, name }).returning({ id: permission.id });
    return json({ data: { id: ins[0].id } }, { status: 201 });
  } catch (e) {
    return error(400, 'ไม่สามารถสร้างสิทธิ์ได้ (อาจซ้ำ)');
  }
};
