import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { homeroomAssignment } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseHomeroomAssignmentUpdate } from '$lib/server/validators/homeroom';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'homeroom');
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
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'homeroom');
  await db.delete(homeroomAssignment).where(eq(homeroomAssignment.id, params.id));
  return json({ ok: true });
};
