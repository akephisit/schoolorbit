import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { role, userRole } from '$lib/server/schema';
import { eq, inArray } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseRoleAssignmentInput, validateRoleCodes } from '$lib/server/validators/users';
import { assertFeatureEnabled } from '$lib/server/features';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) {
    return error(403, 'Forbidden');
  }
  await assertFeatureEnabled(locals, 'user-management');
  const id = params.id;
  const jsonBody = await request.json().catch(() => ({}));
  const parsed = parseRoleAssignmentInput(jsonBody);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }

  const roleCodes = validateRoleCodes(parsed.data.roles ?? []);

  const rws = roleCodes.length ? await db.select().from(role).where(inArray(role.code, roleCodes)) : [];
  const vals = rws.map(r => ({ userId: id, roleId: r.id }));

  // replace set
  await db.delete(userRole).where(eq(userRole.userId, id));
  if (vals.length) await db.insert(userRole).values(vals);

  return json({ ok: true, roles: rws.map(r => r.code) });
};
