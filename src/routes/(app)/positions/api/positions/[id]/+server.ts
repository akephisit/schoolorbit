import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { position } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const patch: any = {};
  if (typeof body.titleTh === 'string') patch.titleTh = body.titleTh.trim();
  if (typeof body.category === 'string' || body.category === null) patch.category = body.category ?? null;
  if (!Object.keys(patch).length) return json({ ok: true });
  await db.update(position).set(patch).where(eq(position.id, id));
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  if (!locals.me?.data?.perms?.includes('user:manage')) return error(403, 'Forbidden');
  const id = params.id;
  await db.delete(position).where(eq(position.id, id));
  return json({ ok: true });
};

