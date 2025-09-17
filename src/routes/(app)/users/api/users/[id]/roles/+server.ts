import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { role, userRole } from '$lib/server/schema';
import { eq, inArray } from 'drizzle-orm';
import { parseRoleAssignmentInput, validateRoleCodes } from '$lib/server/validators/users';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  const id = params.id;
  const jsonBody = await request.json().catch(() => ({}));
  const parsed = parseRoleAssignmentInput(jsonBody);
  if (!parsed.ok) {
    return error(400, parsed.message);
  }

  const roleCodes = validateRoleCodes(parsed.data.roles ?? []);

  const rws = roleCodes.length ? await db.select().from(role).where(inArray(role.code, roleCodes)) : [];
  const vals = rws.map(r => ({ userId: id, roleId: r.id }));

  // replace set
  await db.delete(userRole).where(eq(userRole.userId, id));
  if (vals.length) await db.insert(userRole).values(vals);

  return json({ ok: true, roles: rws.map(r => r.code) });
};
