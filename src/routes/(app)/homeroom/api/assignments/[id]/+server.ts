import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { homeroomAssignment } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseHomeroomAssignmentUpdate } from '$lib/server/validators/homeroom';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const parsed = parseHomeroomAssignmentUpdate(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  await db.update(homeroomAssignment).set(parsed.data).where(eq(homeroomAssignment.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await db.delete(homeroomAssignment).where(eq(homeroomAssignment.id, params.id));
  return json({ ok: true });
};
