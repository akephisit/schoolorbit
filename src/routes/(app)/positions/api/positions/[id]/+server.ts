import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { position } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { validationError } from '$lib/server/validators/core';
import { parseUpdatePositionInput } from '$lib/server/validators/positions';
import { assertFeatureEnabled } from '$lib/server/features';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'position-management');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const parsed = parseUpdatePositionInput(body);
  if (!parsed.ok) {
    return validationError(parsed.error);
  }
  await db.update(position).set(parsed.data).where(eq(position.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'position-management');
  const id = params.id;
  await db.delete(position).where(eq(position.id, id));
  return json({ ok: true });
};
