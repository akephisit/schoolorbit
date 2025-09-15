import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { positionAssignment } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const patch: any = {};
  if (body.startDate !== undefined) patch.startDate = body.startDate;
  if (body.endDate !== undefined) patch.endDate = body.endDate;
  if (!Object.keys(patch).length) return json({ ok: true });
  await db.update(positionAssignment).set(patch).where(eq(positionAssignment.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  await db.delete(positionAssignment).where(eq(positionAssignment.id, params.id));
  return json({ ok: true });
};

