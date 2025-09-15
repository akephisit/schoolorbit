import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { role, userRole } from '$lib/server/schema';
import { eq, inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  let rolesInput: string[] = Array.isArray(body.roles) ? body.roles : [];
  // Enforce fixed roles set
  const allowed = new Set(['staff', 'student', 'parent']);
  rolesInput = rolesInput.filter((r) => allowed.has(r));

  // resolve codes
  const rws = rolesInput.length ? await db.select().from(role).where(inArray(role.code, rolesInput)) : [];
  const vals = rws.map(r => ({ userId: id, roleId: r.id }));

  // replace set
  await db.delete(userRole).where(eq(userRole.userId, id));
  if (vals.length) await db.insert(userRole).values(vals);

  return json({ ok: true, roles: rws.map(r => r.code) });
};
