import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { role, rolePermission, permission } from '$lib/server/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const rid = params.id;
  const rows = await db
    .select({ code: permission.code })
    .from(rolePermission)
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(eq(rolePermission.roleId, rid));
  return json({ data: rows.map(r => r.code) });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const rid = params.id;
  const body = await request.json().catch(() => ({}));
  const codes: string[] = Array.isArray(body.permissions) ? body.permissions : [];

  // Resolve codes to ids
  const allPerms = codes.length ? await db.select().from(permission).where(inArray(permission.code, codes)) : [];
  const vals = allPerms.map(p => ({ roleId: rid, permissionId: p.id }));

  // Replace set
  await db.delete(rolePermission).where(eq(rolePermission.roleId, rid));
  if (vals.length) await db.insert(rolePermission).values(vals);
  return json({ ok: true, permissions: allPerms.map(p => p.code) });
};

