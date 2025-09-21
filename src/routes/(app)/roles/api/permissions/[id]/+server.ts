import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { permission } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parsePermissionUpdateInput } from '$lib/server/validators/roles';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'role-management');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const parsed = parsePermissionUpdateInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  await db.update(permission).set({ name: parsed.data.name }).where(eq(permission.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'role-management');
  const id = params.id;
  await db.delete(permission).where(eq(permission.id, id));
  return json({ ok: true });
};
