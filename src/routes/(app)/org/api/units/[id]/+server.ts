import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { orgUnit } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseUpdateUnitInput } from '$lib/server/validators/org';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const parsed = parseUpdateUnitInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  const patch = parsed.data;
  await db.update(orgUnit).set(patch).where(eq(orgUnit.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  await db.delete(orgUnit).where(eq(orgUnit.id, id));
  return json({ ok: true });
};
