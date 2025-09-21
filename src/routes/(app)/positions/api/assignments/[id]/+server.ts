import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { positionAssignment } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { assertFeatureEnabled } from '$lib/server/features';

export const PUT: RequestHandler = async ({ locals }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  // No updatable fields when period fields are removed
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await assertFeatureEnabled(locals, 'position-management');
  await db.delete(positionAssignment).where(eq(positionAssignment.id, params.id));
  return json({ ok: true });
};
