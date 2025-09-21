import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { positionAssignment } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { assertFeatureEnabled } from '$lib/server/features';
import { authorize } from '$lib/server/authorization';

export const PUT: RequestHandler = async ({ locals }) => {
  await authorize(locals, 'user:manage');
  // No updatable fields when period fields are removed
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  await authorize(locals, 'user:manage');
  await assertFeatureEnabled(locals, 'position-management');
  await db.delete(positionAssignment).where(eq(positionAssignment.id, params.id));
  return json({ ok: true });
};
